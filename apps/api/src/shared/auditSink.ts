import type {
  AuditActor,
  AuditEvent,
  AuditFailurePolicyInput,
  AuditRequestContext,
  AuditSource,
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

export function createContextualAuditSink(input: {
  actor?: AuditActor;
  correlationId?: string;
  request: AuditRequestContext;
  sink: AuditSink;
  source?: AuditSource;
  storeId?: string | null;
  tenantId?: string | null;
}): AuditSink {
  return {
    record: async (event) => {
      const correlationId =
        input.correlationId ??
        input.request.correlationId ??
        event.correlationId;
      await input.sink.record({
        ...event,
        actor: input.actor ?? event.actor,
        request: {
          ...event.request,
          ...input.request,
        },
        requestId: input.request.requestId,
        storeId: input.storeId ?? event.storeId,
        tenantId: input.tenantId ?? event.tenantId,
        ...(correlationId ? { correlationId } : {}),
        ...(input.source
          ? {
              source: {
                ...event.source,
                ...input.source,
              },
            }
          : {}),
      });
    },
  };
}

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
        category: event.category ?? null,
        correlationId: event.correlationId ?? null,
        criticality: event.criticality ?? null,
        entityId: event.entityId,
        entityType: event.entityType,
        failureTier: event.failureTier ?? null,
        outcome: event.outcome ?? null,
        providerEventId: event.provider?.eventId ?? null,
        providerName: event.provider?.name ?? null,
        requestId: event.requestId,
        severity: event.severity ?? null,
        sinkName,
        sourceComponent: event.source?.component ?? null,
        sourceService: event.source?.service ?? null,
        storeId: event.storeId,
        summary: event.summary ?? null,
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
