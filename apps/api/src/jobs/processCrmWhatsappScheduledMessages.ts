import type { AuditSink } from "@lojaveiculosv2/audit";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createRuntimeAppDependencies } from "../infrastructure/db/runtimeRepositories.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
  type ServiceContext,
  type ServiceLogger,
  type StoreScopedServiceContext,
} from "../shared/serviceContext.js";
import type { CrmServices } from "../features/crm/controllers/crmServices.js";

loadLocalEnv();

type DueScope = {
  storeId: string;
  tenantId: string;
};

async function main(): Promise<void> {
  const runtime = createRuntimeAppDependencies();
  const logger = createConsoleServiceLogger();
  try {
    const services = runtime.appOptions.crmServices;
    if (!services) {
      throw new Error("CRM services are not available for schedule worker.");
    }
    const dueAt =
      parseOptionalDate("CRM_WHATSAPP_SCHEDULE_DUE_AT") ?? new Date();
    const perScopeLimit =
      parseOptionalPositiveInt("CRM_WHATSAPP_SCHEDULE_BATCH_SIZE") ?? 25;
    const scopeLimit =
      parseOptionalPositiveInt("CRM_WHATSAPP_SCHEDULE_SCOPE_LIMIT") ?? 100;
    const result = await processDueSchedules({
      ...(runtime.appOptions.audit ? { audit: runtime.appOptions.audit } : {}),
      dueAt,
      logger,
      perScopeLimit,
      scopeLimit,
      services,
    });
    logger.info("crm.whatsapp.schedule.worker.finished", result);
  } finally {
    await runtime.close();
  }
}

async function processDueSchedules(input: {
  audit?: AuditSink;
  dueAt: Date;
  logger: ServiceLogger;
  perScopeLimit: number;
  scopeLimit: number;
  services: CrmServices;
}) {
  const discoveryContext = createWorkerContext({
    ...(input.audit ? { audit: input.audit } : {}),
    logger: input.logger,
    requestId: `crm_whatsapp_schedule_discovery_${Date.now()}`,
  });
  const scopes = await input.services.listDueWhatsappScheduledMessageScopes(
    discoveryContext,
    { dueAt: input.dueAt, limit: input.scopeLimit },
  );
  let failed = 0;
  let processed = 0;
  let sent = 0;
  for (const scope of scopes) {
    const context = createWorkerStoreContext({
      ...(input.audit ? { audit: input.audit } : {}),
      logger: input.logger,
      scope,
    });
    const result = await input.services.processDueWhatsappScheduledMessages(
      context,
      { dueAt: input.dueAt, limit: input.perScopeLimit },
    );
    failed += result.failed;
    processed += result.processed;
    sent += result.sent;
  }
  return {
    dueAt: input.dueAt.toISOString(),
    failed,
    processed,
    scopes: scopes.length,
    sent,
  };
}

function createWorkerContext(input: {
  audit?: AuditSink;
  logger: ServiceLogger;
  requestId: string;
}): ServiceContext {
  return createServiceContext({
    actor: { id: "crm_whatsapp_schedule_worker", kind: "system" },
    ...(input.audit ? { audit: input.audit } : {}),
    logger: input.logger,
    permissions: ["crm.whatsapp.schedule.process", "crm.whatsapp.send"],
    request: { requestId: input.requestId },
    source: { component: "crm-whatsapp-schedule-worker", service: "api" },
  });
}

function createWorkerStoreContext(input: {
  audit?: AuditSink;
  logger: ServiceLogger;
  scope: DueScope;
}): StoreScopedServiceContext {
  const context = createServiceContext({
    actor: { id: "crm_whatsapp_schedule_worker", kind: "system" },
    ...(input.audit ? { audit: input.audit } : {}),
    logger: input.logger,
    permissions: ["crm.whatsapp.schedule.process", "crm.whatsapp.send"],
    request: {
      requestId: `crm_whatsapp_schedule_${input.scope.storeId}_${Date.now()}`,
    },
    source: { component: "crm-whatsapp-schedule-worker", service: "api" },
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  });
  return {
    ...context,
    entitlements: ["crm"] as const,
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
  };
}

function parseOptionalDate(name: string): Date | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be an ISO datetime when provided.`);
  }
  return value;
}

function parseOptionalPositiveInt(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
