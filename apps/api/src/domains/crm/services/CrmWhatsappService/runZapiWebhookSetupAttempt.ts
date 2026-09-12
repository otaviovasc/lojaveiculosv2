import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmMessagingWebhookConfigResult } from "../../ports/crmMessagingGateway.js";
import {
  buildWhatsappWebhookEndpoints,
  resolveWebhookBaseUrl,
} from "../../whatsapp/whatsappWebhookEndpoints.js";
import {
  completeZapiWebhookSetupAttempt,
  createZapiWebhookSetupIntent,
  failZapiWebhookSetupAttempt,
  readZapiWebhookSetupState,
  withZapiWebhookSetupState,
  type ZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import {
  getCrmConnectionRepository,
  getCrmMessagingGateway,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { logCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import { openZapiWebhookSecret } from "../../whatsapp/zapiWebhookSecret.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import { assertTrustedZapiWebhookDestination } from "../../whatsapp/zapiWebhookDestination.js";
import { reconcileZapiConnectionStatus } from "./reconcileZapiConnectionStatus.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";
import {
  auditZapiWebhookSetupResult,
  logZapiWebhookSetup,
} from "./zapiWebhookSetupObservability.js";
export type RunZapiWebhookSetupInput = {
  basePath: string;
  canonicalApiOrigin: string;
  connectionId: string;
  forceReconfigure?: boolean;
  webhookSecretSlot?: "current" | "pending";
};
export type RunZapiWebhookSetupResult = {
  connectionStatus: "active" | "disconnected" | "unverified";
  results: readonly CrmMessagingWebhookConfigResult[];
  setup: ZapiWebhookSetupState;
};
const setupLeaseDurationMs = 5 * 60 * 1_000;
export async function runZapiWebhookSetupAttempt(
  context: ServiceContext,
  input: RunZapiWebhookSetupInput,
  ports: CrmServicePorts,
): Promise<RunZapiWebhookSetupResult> {
  assertPermission(context, "crm.messaging.connection.setup");
  const scope = requireCrmMessagingScope(context);
  assertEntitlement(context as never, "crm");
  const repository = getCrmConnectionRepository(ports);
  const connection = await repository.findConnectionById(input.connectionId);
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionNotFoundError(input.connectionId);
  }
  assertTrustedZapiWebhookDestination(
    connection.webhookUrl,
    input.canonicalApiOrigin,
  );
  const startedAt = Date.now();
  const persistedSetup = readZapiWebhookSetupState(connection.metadata);
  const current = persistedSetup ?? createZapiWebhookSetupIntent(connection.id);
  if (current.status === "configured" && !input.forceReconfigure) {
    await auditZapiWebhookSetupResult(context, connection.id, current);
    const connectionStatus = await reconcileZapiConnectionStatus(
      context,
      connection,
      ports,
    );
    return { connectionStatus, results: [], setup: current };
  }
  if (!persistedSetup) {
    const normalized = await repository.updateConnection({
      connectionId: connection.id,
      metadata: withZapiWebhookSetupState(connection.metadata, current),
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    if (!normalized) throw new Error("Z-API setup state was not persisted.");
  }
  const now = new Date();
  const leaseOwner = crypto.randomUUID();
  const pending = await repository.claimZapiWebhookSetup({
    // Version 1 accepted provider ACKs without readback. Always allow claiming
    // raw "configured" metadata here; verified version 2 already returned above.
    allowConfigured: true,
    connectionId: connection.id,
    leaseExpiresAt: new Date(now.getTime() + setupLeaseDurationMs),
    leaseOwner,
    now,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!pending) {
    const latest = await repository.findConnectionById(connection.id);
    const setup = latest ? readZapiWebhookSetupState(latest.metadata) : null;
    if (!setup) throw new Error("Z-API setup target is unavailable.");
    if (latest && setup.status === "configured") {
      const connectionStatus = await reconcileZapiConnectionStatus(
        context,
        latest,
        ports,
      );
      return { connectionStatus, results: [], setup };
    }
    return { connectionStatus: "unverified", results: [], setup };
  }
  const configuring = readZapiWebhookSetupState(pending.metadata);
  if (!configuring || configuring.leaseOwner !== leaseOwner) {
    throw new Error("Z-API setup lease was not persisted.");
  }
  logZapiWebhookSetup(
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
  const endpoints = buildWhatsappWebhookEndpoints({
    baseUrl,
    connectionId: connection.id,
    token: await openZapiWebhookSecret(
      connection,
      ports,
      input.webhookSecretSlot ?? "current",
    ),
  });
  let response: { results: readonly CrmMessagingWebhookConfigResult[] };
  try {
    response = await getCrmMessagingGateway(ports).configureWebhooks(pending, {
      correlationId: context.correlationId ?? context.requestId,
      webhooks: endpoints.map((endpoint) => ({
        type: endpoint.type,
        url: endpoint.url,
      })),
    });
  } catch (error) {
    const setup = failZapiWebhookSetupAttempt(configuring, error);
    await persistSetupState(pending, setup, leaseOwner, ports);
    logZapiWebhookSetup(context, "failed", connection.id, setup, startedAt);
    await auditZapiWebhookSetupResult(context, connection.id, setup);
    return { connectionStatus: "unverified", results: [], setup };
  }
  // Provider success is durable before optional audit/billing bookkeeping.
  const setup = completeZapiWebhookSetupAttempt(configuring, response.results);
  await persistSetupState(pending, setup, leaseOwner, ports);
  logZapiWebhookSetup(context, "completed", connection.id, setup, startedAt);
  await auditZapiWebhookSetupResult(context, connection.id, setup);
  let connectionStatus: "active" | "disconnected" | "unverified" = "unverified";
  if (setup.status === "configured") {
    const configuredConnection =
      (await repository.findConnectionById(connection.id)) ?? connection;
    connectionStatus = await reconcileZapiConnectionStatus(
      context,
      configuredConnection,
      ports,
    );
  }
  return { connectionStatus, results: response.results, setup };
}
async function persistSetupState(
  connection: CrmConnection,
  setup: ZapiWebhookSetupState,
  leaseOwner: string,
  ports: CrmServicePorts,
) {
  const updated = await getCrmConnectionRepository(
    ports,
  ).finishZapiWebhookSetup({
    connectionId: connection.id,
    leaseOwner,
    metadata: withZapiWebhookSetupState(
      {
        ...connection.metadata,
        capabilities: crmChannelConnectionCapabilityFacts({
          broker: "direct",
          channel: "whatsapp",
          provider: "zapi",
        }),
        connected: false,
        degraded: setup.status === "failed" || setup.status === "partial",
        errorCode: setup.lastErrorCode,
      },
      setup,
    ),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new Error("Z-API setup lease is no longer owned.");
}
