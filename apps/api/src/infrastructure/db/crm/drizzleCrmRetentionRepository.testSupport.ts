export function retentionBatchInput(dryRun: boolean) {
  return {
    auditIntent: {
      actorId: "retention_worker",
      actorKind: "system" as const,
      idempotencyKey: "retention_test",
      requestId: "request_1",
    },
    cutoffs: {
      botInteractionBefore: new Date("2026-07-13T15:00:00.000Z"),
      canonicalMessageBefore: new Date("2025-02-12T15:00:00.000Z"),
      providerRawPayloadBefore: new Date("2026-08-05T15:00:00.000Z"),
    },
    dryRun,
    limit: 100,
    now: new Date("2026-08-12T15:00:00.000Z"),
    scope: {
      storeId: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000002",
    },
  };
}
