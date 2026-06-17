import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import {
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
