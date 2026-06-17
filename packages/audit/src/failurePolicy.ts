import type {
  AuditEvent,
  AuditFailureTier,
  AuditSink,
  SafeAuditMetadata,
} from "./contracts.js";

export type AuditFailurePolicy = {
  logLevel: "warn" | "error";
  rethrow: boolean;
  tier: AuditFailureTier;
};

export type AuditFailurePolicyInput = AuditFailurePolicy | AuditFailureTier;

export type AuditFailurePolicyLogger = {
  error: (message: string, metadata?: SafeAuditMetadata) => void;
  warn: (message: string, metadata?: SafeAuditMetadata) => void;
};

export type AuditRecordSuccess = {
  event: AuditEvent;
  ok: true;
  policy: AuditFailurePolicy;
};

export type AuditRecordFailure = {
  error: unknown;
  event: AuditEvent;
  ok: false;
  policy: AuditFailurePolicy;
};

export type AuditRecordResult = AuditRecordFailure | AuditRecordSuccess;

export const auditFailurePolicies = {
  bestEffort: {
    logLevel: "warn",
    rethrow: false,
    tier: "best_effort",
  },
  important: {
    logLevel: "error",
    rethrow: false,
    tier: "important",
  },
  required: {
    logLevel: "error",
    rethrow: true,
    tier: "required",
  },
} satisfies Record<string, AuditFailurePolicy>;

const auditFailurePoliciesByTier = {
  best_effort: auditFailurePolicies.bestEffort,
  important: auditFailurePolicies.important,
  required: auditFailurePolicies.required,
} satisfies Record<AuditFailureTier, AuditFailurePolicy>;

export type RecordAuditEventInput = {
  event: AuditEvent;
  logger?: AuditFailurePolicyLogger;
  policy?: AuditFailurePolicyInput;
  sink: AuditSink;
};

export function resolveAuditFailurePolicy(
  policy?: AuditFailurePolicyInput,
): AuditFailurePolicy {
  if (!policy) return auditFailurePolicies.bestEffort;
  if (typeof policy === "string") return auditFailurePoliciesByTier[policy];
  return policy;
}

export function resolveAuditFailurePolicyForEvent(
  event: Pick<AuditEvent, "criticality" | "failureTier">,
  fallback?: AuditFailurePolicyInput,
): AuditFailurePolicy {
  if (event.failureTier) return resolveAuditFailurePolicy(event.failureTier);
  if (event.criticality === "critical") return auditFailurePolicies.required;
  if (event.criticality === "high") return auditFailurePolicies.important;
  return resolveAuditFailurePolicy(fallback);
}

export function isRequiredAuditPolicy(
  policy: AuditFailurePolicyInput,
): boolean {
  return resolveAuditFailurePolicy(policy).rethrow;
}

export async function recordAuditEvent(
  input: RecordAuditEventInput,
): Promise<AuditRecordResult> {
  const policy = resolveAuditFailurePolicyForEvent(input.event, input.policy);

  try {
    await input.sink.record(input.event);
    return { event: input.event, ok: true, policy };
  } catch (error) {
    const metadata: SafeAuditMetadata = {
      action: input.event.action,
      correlationId: input.event.correlationId ?? null,
      entityId: input.event.entityId,
      entityType: input.event.entityType,
      errorMessage: error instanceof Error ? error.message : String(error),
      requestId: input.event.requestId,
      tier: policy.tier,
    };

    input.logger?.[policy.logLevel]("audit.record.failed", metadata);

    if (policy.rethrow) {
      throw error;
    }

    return { error, event: input.event, ok: false, policy };
  }
}

export type AuditRecorder = {
  record: (
    event: AuditEvent,
    policy?: AuditFailurePolicyInput,
  ) => Promise<AuditRecordResult>;
};

export function createAuditRecorder(input: {
  defaultPolicy?: AuditFailurePolicyInput;
  logger?: AuditFailurePolicyLogger;
  sink: AuditSink;
}): AuditRecorder {
  return {
    record: (event, policy) => {
      const recordInput: RecordAuditEventInput = {
        event,
        sink: input.sink,
      };
      const resolvedPolicy = policy ?? input.defaultPolicy;

      if (input.logger) recordInput.logger = input.logger;
      if (resolvedPolicy) recordInput.policy = resolvedPolicy;

      return recordAuditEvent(recordInput);
    },
  };
}
