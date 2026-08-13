import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmWhatsappWebhookConfigResult } from "../../ports/crmWhatsappGateway.js";
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
  getCrmWhatsappGateway,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmZapiSetupCompletionReporter } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";
import { openZapiWebhookSecret } from "../../whatsapp/zapiWebhookSecret.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import { assertTrustedZapiWebhookDestination } from "../../whatsapp/zapiWebhookDestination.js";
import { reconcileZapiConnectionStatus } from "./reconcileZapiConnectionStatus.js";

export type RunZapiWebhookSetupInput = {
  basePath: string;
  canonicalApiOrigin: string;
  connectionId: string;
  forceReconfigure?: boolean;
};

export type RunZapiWebhookSetupResult = {
  results: readonly CrmWhatsappWebhookConfigResult[];
  setup: ZapiWebhookSetupState;
};

const setupLeaseDurationMs = 5 * 60 * 1_000;

export async function runZapiWebhookSetupAttempt(
  context: ServiceContext,
  input: RunZapiWebhookSetupInput,
  ports: CrmServicePorts,
): Promise<RunZapiWebhookSetupResult> {
  assertPermission(context, "crm.messaging.connection.setup");
  const scope = requireCrmWhatsappScope(context);
  assertEntitlement(context as never, "crm_zapi");
  const repository = getCrmConnectionRepository(ports);
  const connection = await repository.findConnectionById(input.connectionId);
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(input.connectionId);
  }
  assertTrustedZapiWebhookDestination(
    connection.webhookUrl,
    input.canonicalApiOrigin,
  );
  const startedAt = Date.now();
  const current =
    readZapiWebhookSetupState(connection.metadata) ??
    createZapiWebhookSetupIntent(connection.id);
  if (current.status === "configured" && !input.forceReconfigure) {
    await auditSetupResult(context, connection.id, current);
    await reportConfiguredSetup(context, connection.id, current, ports);
    await reconcileZapiConnectionStatus(context, connection, ports);
    return { results: [], setup: current };
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
      await reportConfiguredSetup(context, connection.id, setup, ports);
      await reconcileZapiConnectionStatus(context, latest, ports);
    }
    return { results: [], setup };
  }
  const configuring = readZapiWebhookSetupState(pending.metadata);
  if (!configuring || configuring.leaseOwner !== leaseOwner) {
    throw new Error("Z-API setup lease was not persisted.");
  }

  logSetup(context, "started", connection.id, configuring, startedAt);
  const baseUrl = resolveWebhookBaseUrl({
    basePath: input.basePath,
    requestOrigin: input.canonicalApiOrigin,
    webhookUrl: connection.webhookUrl,
  });
  const endpoints = buildWhatsappWebhookEndpoints({
    baseUrl,
    connectionId: connection.id,
    token: await openZapiWebhookSecret(connection, ports),
  });
  let response: { results: readonly CrmWhatsappWebhookConfigResult[] };
  try {
    response = await getCrmWhatsappGateway(ports).configureWebhooks(pending, {
      correlationId: context.correlationId ?? context.requestId,
      webhooks: endpoints.map((endpoint) => ({
        type: endpoint.type,
        url: endpoint.url,
      })),
    });
  } catch (error) {
    const setup = failZapiWebhookSetupAttempt(configuring, error);
    await persistSetupState(pending, setup, leaseOwner, ports);
    logSetup(context, "failed", connection.id, setup, startedAt);
    await auditSetupResult(context, connection.id, setup);
    return { results: [], setup };
  }

  // Provider success is durable before optional audit/billing bookkeeping.
  // A bookkeeping failure must never cause another provider registration.
  const setup = completeZapiWebhookSetupAttempt(configuring, response.results);
  await persistSetupState(pending, setup, leaseOwner, ports);
  logSetup(context, "completed", connection.id, setup, startedAt);
  await auditSetupResult(context, connection.id, setup);
  if (setup.status === "configured") {
    await reportConfiguredSetup(context, connection.id, setup, ports);
    const configuredConnection =
      (await repository.findConnectionById(connection.id)) ?? connection;
    await reconcileZapiConnectionStatus(context, configuredConnection, ports);
  }
  return { results: response.results, setup };
}

async function reportConfiguredSetup(
  context: ServiceContext,
  connectionId: string,
  setup: ZapiWebhookSetupState,
  ports: CrmServicePorts,
) {
  try {
    await getCrmZapiSetupCompletionReporter(ports)?.completeSetup(context, {
      connectionId,
    });
  } catch (error) {
    logWhatsappServiceEvent(context, "crm.provider.zapi.setup_report.failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      operation: "report_setup_completed",
      provider: "zapi",
      setupStatus: setup.status,
      supportCode: setup.supportCode,
    });
  }
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
    metadata: withZapiWebhookSetupState(connection.metadata, setup),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new Error("Z-API setup lease is no longer owned.");
}

function logSetup(
  context: ServiceContext,
  phase: "completed" | "failed" | "started",
  connectionId: string,
  setup: ZapiWebhookSetupState,
  startedAt: number,
) {
  logWhatsappServiceEvent(context, `crm.provider.zapi.webhooks.${phase}`, {
    attemptCount: setup.attemptCount,
    connectionId,
    durationMs: Math.max(0, Date.now() - startedAt),
    errorCode: setup.lastErrorCode,
    operation: "configure_webhooks",
    provider: "zapi",
    setupStatus: setup.status,
    succeededCount: setup.succeededTypes.length,
    supportCode: setup.supportCode,
  });
}

async function auditSetupResult(
  context: ServiceContext,
  connectionId: string,
  setup: ZapiWebhookSetupState,
) {
  await auditWhatsappServiceEvent(
    context,
    {
      action: "crm.whatsapp.connection.zapi.setup.result",
      category: "data_change",
      entityId: connectionId,
      entityType: "crm_whatsapp_connection",
      failureTier: "required",
      metadata: {
        attemptCount: setup.attemptCount,
        errorCode: setup.lastErrorCode,
        setupStatus: setup.status,
        succeededCount: setup.succeededTypes.length,
        supportCode: setup.supportCode,
      },
      permission: "crm.messaging.connection.setup",
      summary: "Processed Z-API webhook setup intent",
    },
    setup.status === "configured" ? "succeeded" : "failed",
  );
}
