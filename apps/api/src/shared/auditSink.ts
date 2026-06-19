import type {
  AuditEvent,
  AuditFailurePolicyInput,
  AuditSink,
} from "@lojaveiculosv2/audit";
import {
  createAuditRecorder,
  createMemoryAuditSink,
  createNoopAuditSink,
} from "@lojaveiculosv2/audit";
import type { ServiceLogger } from "./serviceLogger.js";

export { createMemoryAuditSink, createNoopAuditSink };
export type { AuditEvent, AuditSink };

export function createLoggingAuditSink(input: {
  logger: ServiceLogger;
  sinkName?: string;
}): AuditSink {
  const sinkName = input.sinkName ?? "logger";

  return {
    record: async (event) => {
      input.logger.info("audit.recorded", {
        action: event.action,
        actorId: event.actor.id,
        actorKind: event.actor.kind,
        entityId: event.entityId,
        entityType: event.entityType,
        requestId: event.requestId,
        sinkName,
        storeId: event.storeId,
        tenantId: event.tenantId,
      });
    },
  };
}

export function createPolicyAwareAuditSink(input: {
  defaultPolicy?: AuditFailurePolicyInput;
  logger?: ServiceLogger;
  sink: AuditSink;
}): AuditSink {
  const recorder = createAuditRecorder({
    sink: input.sink,
    ...(input.logger ? { logger: input.logger } : {}),
    ...(input.defaultPolicy ? { defaultPolicy: input.defaultPolicy } : {}),
  });

  return {
    record: async (event) => {
      await recorder.record(event);
    },
  };
}
