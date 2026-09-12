import type { AuditSink } from "@lojaveiculosv2/audit";
import {
  createServiceContext,
  type ServiceContext,
  type ServiceLogger,
} from "../shared/serviceContext.js";

type WorkerContextInput = {
  audit?: AuditSink;
  logger: ServiceLogger;
  requestId: string;
};

const workerPermissions = [
  "crm.messages.ingest",
  "crm.scheduled_messages.process",
  "crm.messages.send",
] as const;

export function createCrmScheduledWorkerContext(
  input: WorkerContextInput,
): ServiceContext {
  return createContext(input, workerPermissions);
}

export function createCrmScheduledWorkerMaintenanceContext(
  input: WorkerContextInput,
): ServiceContext {
  return createContext(input, [
    ...workerPermissions,
    "crm.messaging.connection.setup",
  ]);
}

function createContext(
  input: WorkerContextInput,
  permissions: readonly string[],
): ServiceContext {
  return createServiceContext({
    actor: { id: "crm_schedule_worker", kind: "system" },
    ...(input.audit ? { audit: input.audit } : {}),
    logger: input.logger,
    entitlements: ["crm"],
    permissions,
    request: { requestId: input.requestId },
    source: { component: "crm-schedule-worker", service: "api" },
  });
}
