import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmMessagingWebhookConfigResult } from "../../ports/crmMessagingGateway.js";
import { resolveWebhookBaseUrl } from "../../whatsapp/whatsappWebhookEndpoints.js";
import {
  completeUazapiWebhookSetupAttempt,
  createUazapiWebhookSetupIntent,
  failUazapiWebhookSetupAttempt,
  markUazapiWebhookSetupAttempt,
  readUazapiWebhookSetupState,
  withUazapiWebhookSetupState,
  type UazapiWebhookSetupState,
} from "../../whatsapp/uazapiWebhookSetupState.js";
import {
  getCrmConnectionRepository,
  getCrmMessagingGateway,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { openUazapiWebhookSecret } from "../../whatsapp/uazapiWebhookSecret.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import { assertTrustedUazapiWebhookDestination } from "../../whatsapp/uazapiWebhookDestination.js";
import { reconcileUazapiConnectionStatus } from "./reconcileUazapiConnectionStatus.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";

export type RunUazapiWebhookSetupInput = {
  basePath: string;
  canonicalApiOrigin: string;
  connectionId: string;
  forceReconfigure?: boolean;
};

export type RunUazapiWebhookSetupResult = {
  connectionStatus: "active" | "disconnected" | "unverified";
  results: readonly CrmMessagingWebhookConfigResult[];
  setup: UazapiWebhookSetupState;
};

export async function runUazapiWebhookSetupAttempt(
  context: ServiceContext,
  input: RunUazapiWebhookSetupInput,
  ports: CrmServicePorts,
): Promise<RunUazapiWebhookSetupResult> {
  assertPermission(context, "crm.messaging.connection.setup");
  const scope = requireCrmMessagingScope(context);
  assertEntitlement(context as never, "crm");
  const repository = getCrmConnectionRepository(ports);
  const connection = await repository.findConnectionById(input.connectionId);
  if (
    !connection ||
    connection.provider !== "uazapi" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionNotFoundError(input.connectionId);
  }
  assertTrustedUazapiWebhookDestination(
    connection.webhookUrl,
    input.canonicalApiOrigin,
  );
  const startedAt = Date.now();
  const current =
    readUazapiWebhookSetupState(connection.metadata) ??
    createUazapiWebhookSetupIntent(connection.id);
  if (current.state === "configured" && !input.forceReconfigure) {
    await auditUazapiWebhookSetupResult(context, connection.id, current);
    const connectionStatus = await reconcileUazapiConnectionStatus(
      context,
      connection,
      ports,
    );
    return { connectionStatus, results: [], setup: current };
  }
  const configuring = markUazapiWebhookSetupAttempt(current);
  await persistSetupState(connection, configuring, ports);
  logUazapiWebhookSetup(
    context,
    "started",
    connection.id,
    configuring,
    startedAt,
  );

  const baseUrl = resolveWebhookBaseUrl({
    basePath: input.basePath,
    requestOrigin: input.canonicalApiOrigin,
    webhookUrl: connection.webhookUrl,
  });
  const registrationUrl = buildUazapiWebhookUrl({
    baseUrl,
    connectionId: connection.id,
    token: await openUazapiWebhookSecret(connection, ports),
  });
  let response: { results: readonly CrmMessagingWebhookConfigResult[] };
  try {
    response = await getCrmMessagingGateway(ports).configureWebhooks(
      connection,
      {
        correlationId: context.correlationId ?? context.requestId,
        webhooks: [{ type: "uazapi", url: registrationUrl }],
      },
    );
  } catch (error) {
    const setup = failUazapiWebhookSetupAttempt(configuring, error);
    await persistSetupState(connection, setup, ports);
    logUazapiWebhookSetup(context, "failed", connection.id, setup, startedAt);
    await auditUazapiWebhookSetupResult(context, connection.id, setup);
    return { connectionStatus: "unverified", results: [], setup };
  }
  // Provider success is durable before optional audit/billing bookkeeping.
  const setup = completeUazapiWebhookSetupAttempt(
    configuring,
    response.results,
  );
  await persistSetupState(connection, setup, ports);
  logUazapiWebhookSetup(context, "completed", connection.id, setup, startedAt);
  await auditUazapiWebhookSetupResult(context, connection.id, setup);
  let connectionStatus: "active" | "disconnected" | "unverified" = "unverified";
  if (setup.state === "configured") {
    const configuredConnection =
      (await repository.findConnectionById(connection.id)) ?? connection;
    connectionStatus = await reconcileUazapiConnectionStatus(
      context,
      configuredConnection,
      ports,
    );
  }
  return { connectionStatus, results: response.results, setup };
}

export function buildUazapiWebhookUrl({
  baseUrl,
  connectionId,
  token,
}: {
  baseUrl: string;
  connectionId: string;
  token: string;
}) {
  return `${baseUrl}/whatsapp/webhooks/uazapi/${encodeURIComponent(
    connectionId,
  )}?token=${encodeURIComponent(token)}`;
}

async function persistSetupState(
  connection: CrmConnection,
  setup: UazapiWebhookSetupState,
  ports: CrmServicePorts,
) {
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    metadata: withUazapiWebhookSetupState(
      {
        ...connection.metadata,
        capabilities: crmChannelConnectionCapabilityFacts({
          broker: "direct",
          channel: "whatsapp",
          provider: "uazapi",
        }),
        degraded: setup.state === "failed",
        errorCode: setup.lastErrorCode,
      },
      setup,
    ),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new Error("Uazapi setup state was not persisted.");
}

function logUazapiWebhookSetup(
  context: ServiceContext,
  phase: "completed" | "failed" | "started",
  connectionId: string,
  setup: UazapiWebhookSetupState,
  startedAt: number,
) {
  logCrmServiceEvent(context, `crm.provider.uazapi.webhooks.${phase}`, {
    attemptCount: setup.attemptCount,
    connectionId,
    durationMs: Math.max(0, Date.now() - startedAt),
    errorCode: setup.lastErrorCode,
    operation: "configure_webhooks",
    provider: "uazapi",
    setupStatus: setup.state,
    succeededCount: setup.succeededTypes.length,
    supportCode: setup.supportCode,
  });
}

async function auditUazapiWebhookSetupResult(
  context: ServiceContext,
  connectionId: string,
  setup: UazapiWebhookSetupState,
) {
  await auditCrmServiceEvent(
    context,
    {
      action: "crm.provider.uazapi.connection.setup.result",
      category: "data_change",
      entityId: connectionId,
      entityType: "crm_channel_connection",
      failureTier: "required",
      metadata: {
        attemptCount: setup.attemptCount,
        errorCode: setup.lastErrorCode,
        setupStatus: setup.state,
        succeededCount: setup.succeededTypes.length,
        supportCode: setup.supportCode,
      },
      permission: "crm.messaging.connection.setup",
      summary: "Processed uazapi webhook setup intent",
    },
    setup.state === "configured" ? "succeeded" : "failed",
  );
}
