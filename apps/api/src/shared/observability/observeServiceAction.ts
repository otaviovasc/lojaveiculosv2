import type {
  AuditCategory,
  AuditCriticality,
  AuditDataClassification,
  AuditFailureTier,
  AuditProviderReference,
  SafeAuditMetadata,
} from "@lojaveiculosv2/audit";
import {
  describeError,
  sanitizeDiagnosticMetadata,
  toSafeErrorMetadata,
} from "../errors/errorDescriptor.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../serviceContext.js";

export type ObservedServiceAction = {
  action: string;
  category?: AuditCategory;
  criticality?: AuditCriticality;
  dataClassification?: AuditDataClassification;
  entityId: string;
  entityType: string;
  failureTier?: AuditFailureTier;
  metadata?: SafeAuditMetadata;
  provider?: AuditProviderReference;
  summary: {
    failed: string;
    succeeded: string;
  };
};

export async function observeServiceAction<T>(
  context: ServiceContext,
  specification: ObservedServiceAction,
  run: () => Promise<T>,
): Promise<T> {
  const metadata = sanitizeDiagnosticMetadata(specification.metadata ?? {});
  context.logger.info(
    specification.action,
    createServiceLogMetadata(context, {
      ...metadata,
      lifecycle: "started",
      ...(specification.provider
        ? { providerName: specification.provider.name }
        : {}),
    }),
  );

  let result: T;
  try {
    result = await run();
  } catch (error) {
    const errorMetadata = toSafeErrorMetadata(error);
    const provider = providerReference(specification.provider, error);
    context.logger.error(
      specification.action,
      createServiceLogMetadata(context, {
        ...metadata,
        ...errorMetadata,
        lifecycle: "failed",
      }),
    );
    await context.audit.record({
      action: specification.action,
      actor: context.actor,
      category: specification.category ?? "integration",
      ...(specification.criticality
        ? { criticality: specification.criticality }
        : {}),
      ...(specification.dataClassification
        ? { dataClassification: specification.dataClassification }
        : {}),
      entityId: specification.entityId,
      entityType: specification.entityType,
      ...(specification.failureTier
        ? { failureTier: specification.failureTier }
        : {}),
      metadata: { ...metadata, ...errorMetadata },
      outcome: "failed",
      ...(provider ? { provider } : {}),
      requestId: context.requestId,
      severity: "error",
      storeId: context.storeId,
      summary: specification.summary.failed,
      tenantId: context.tenantId,
    });
    throw error;
  }

  await context.audit.record({
    action: specification.action,
    actor: context.actor,
    category: specification.category ?? "integration",
    ...(specification.criticality
      ? { criticality: specification.criticality }
      : {}),
    ...(specification.dataClassification
      ? { dataClassification: specification.dataClassification }
      : {}),
    entityId: specification.entityId,
    entityType: specification.entityType,
    ...(specification.failureTier
      ? { failureTier: specification.failureTier }
      : {}),
    metadata,
    outcome: "succeeded",
    ...(specification.provider ? { provider: specification.provider } : {}),
    requestId: context.requestId,
    severity: "info",
    storeId: context.storeId,
    summary: specification.summary.succeeded,
    tenantId: context.tenantId,
  });
  context.logger.info(
    specification.action,
    createServiceLogMetadata(context, {
      ...metadata,
      lifecycle: "succeeded",
      ...(specification.provider
        ? { providerName: specification.provider.name }
        : {}),
    }),
  );
  return result;
}

function providerReference(
  configured: AuditProviderReference | undefined,
  error: unknown,
): AuditProviderReference | undefined {
  if (configured) return configured;
  const provider = describeError(error).provider;
  return provider ? { name: provider } : undefined;
}
