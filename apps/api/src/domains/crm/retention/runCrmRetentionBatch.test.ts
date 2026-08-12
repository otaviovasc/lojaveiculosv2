import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { calculateCrmRetentionCutoffs } from "./crmRetentionPolicy.js";
import { runCrmRetentionBatch } from "./runCrmRetentionBatch.js";
import {
  createRetentionContext as context,
  retentionItem as item,
} from "./testSupportRunCrmRetentionBatch.js";
import { createMemoryCrmRetentionRepository } from "./testSupportRetentionRepository.js";

const now = new Date("2026-08-12T15:00:00.000Z");

describe("CRM retention policy", () => {
  it("calculates calendar-month and day cutoffs", () => {
    expect(calculateCrmRetentionCutoffs(now)).toEqual({
      botInteractionBefore: new Date("2026-07-13T15:00:00.000Z"),
      canonicalMessageBefore: new Date("2025-02-12T15:00:00.000Z"),
      providerRawPayloadBefore: new Date("2026-08-05T15:00:00.000Z"),
    });
  });

  it("only anonymizes canonical messages from old closed cycles", async () => {
    const repository = createMemoryCrmRetentionRepository({
      items: [
        item("old_closed", "canonical_message", "2025-02-12", true),
        item("old_open", "canonical_message", "2024-01-01", false),
        item("recent_closed", "canonical_message", "2025-02-13", true),
      ],
    });

    const result = await runCrmRetentionBatch(
      context(),
      { dryRun: false, now },
      repository,
    );

    expect(result.categories[0]).toMatchObject({ affected: 1, eligible: 1 });
    expect(
      repository.items.find(({ id }) => id === "old_closed")?.anonymized,
    ).toBe(true);
    expect(
      repository.items.find(({ id }) => id === "old_open")?.anonymized,
    ).not.toBe(true);
  });

  it("delimits legal holds by tenant, store, category and resource", async () => {
    const repository = createMemoryCrmRetentionRepository({
      holds: [
        {
          category: "provider_raw_payload",
          resourceId: "held",
          startsAt: new Date("2026-08-01"),
          storeId: "store_1",
          tenantId: "tenant_1",
        },
        {
          category: "provider_raw_payload",
          startsAt: new Date("2026-08-01"),
          storeId: "other_store",
          tenantId: "tenant_1",
        },
      ],
      items: [
        item("held", "provider_raw_payload", "2026-08-01"),
        item("purged", "provider_raw_payload", "2026-08-01"),
      ],
    });

    const result = await runCrmRetentionBatch(
      context(),
      { dryRun: false, now },
      repository,
    );

    expect(result.legalHoldSkipped).toBe(1);
    expect(repository.items.find(({ id }) => id === "held")?.purged).not.toBe(
      true,
    );
    expect(repository.items.find(({ id }) => id === "purged")?.purged).toBe(
      true,
    );
    expect(result.verified).toBe(true);
  });

  it("defaults to dry-run and is idempotent when executed repeatedly", async () => {
    const repository = createMemoryCrmRetentionRepository({
      items: [item("bot_1", "bot_interaction", "2026-01-01")],
    });

    const preview = await runCrmRetentionBatch(context(), { now }, repository);
    expect(preview.dryRun).toBe(true);
    expect(preview.categories[2]).toMatchObject({ affected: 0, eligible: 1 });
    expect(repository.items[0]?.purged).not.toBe(true);

    const first = await runCrmRetentionBatch(
      context(),
      { dryRun: false, now },
      repository,
    );
    const rerun = await runCrmRetentionBatch(
      context(),
      { dryRun: false, now },
      repository,
    );
    expect(first.categories[2]?.affected).toBe(1);
    expect(rerun.categories[2]).toMatchObject({ affected: 0, eligible: 0 });
    expect(rerun.verified).toBe(true);
  });

  it("advances an opaque cursor across bounded batches", async () => {
    const repository = createMemoryCrmRetentionRepository({
      items: [
        item("bot_1", "bot_interaction", "2026-01-01"),
        item("bot_2", "bot_interaction", "2026-01-02"),
        item("bot_3", "bot_interaction", "2026-01-03"),
      ],
    });
    const first = await runCrmRetentionBatch(
      context(),
      { dryRun: true, limit: 1, now },
      repository,
    );
    const second = await runCrmRetentionBatch(
      context(),
      {
        ...(first.nextCursor ? { cursor: first.nextCursor } : {}),
        dryRun: true,
        limit: 1,
        now,
      },
      repository,
    );

    expect(first.nextCursor).toEqual(expect.any(String));
    expect(second.nextCursor).toEqual(expect.any(String));
    expect(first.nextCursor).not.toBe(second.nextCursor);
    expect(first.categories[2]?.eligible).toBe(1);
    expect(second.categories[2]?.eligible).toBe(1);
  });

  it("audits and logs only sanitized counts, never bodies or payloads", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const secret = "customer-message-and-provider-secret";
    const serviceContext = context(audit as AuditSink, logger);
    const repository = createMemoryCrmRetentionRepository({
      items: [item(secret, "provider_raw_payload", "2026-01-01")],
    });

    const result = await runCrmRetentionBatch(
      serviceContext,
      { dryRun: false, now },
      repository,
    );
    const [[event]] = audit.record.mock.calls as unknown as [[AuditEvent]];
    const observable = JSON.stringify({
      audit: event,
      logs: logger.info.mock.calls,
      result,
    });

    expect(event).toMatchObject({
      action: "crm.retention.batch.run",
      metadata: { affectedCount: 1, verified: true },
      outcome: "succeeded",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(observable).not.toContain(secret);
    expect(observable).not.toContain("body");
  });

  it("fails closed and audits when legal-hold storage is unavailable", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createMemoryCrmRetentionRepository({
      items: [item("message", "canonical_message", "2020-01-01", true)],
      unavailableRelations: ["crm_retention_legal_holds"],
    });
    const result = await runCrmRetentionBatch(
      context(audit as AuditSink),
      { dryRun: false, now },
      repository,
    );

    expect(result).toMatchObject({ status: "blocked", verified: false });
    expect(repository.items[0]?.anonymized).not.toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
  });

  it("surfaces legacy reconciliation gaps without blocking safe retention", async () => {
    const repository = createMemoryCrmRetentionRepository({
      items: [item("message", "canonical_message", "2020-01-01", true)],
      legacyCoverageGaps: 2,
    });
    const result = await runCrmRetentionBatch(
      context(),
      { dryRun: false, now },
      repository,
    );

    expect(result).toMatchObject({
      legacyCoverageGaps: 2,
      status: "completed",
      verified: true,
    });
  });

  it("inspects readiness only for the explicit service scope", async () => {
    const repository = createMemoryCrmRetentionRepository();
    const inspectReadiness = vi.spyOn(repository, "inspectReadiness");

    await runCrmRetentionBatch(context(), { dryRun: true, now }, repository);

    expect(inspectReadiness).toHaveBeenCalledWith({
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("audits repository failures without serializing their sensitive message", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const secret = "raw-customer-body";
    const repository = createMemoryCrmRetentionRepository();
    repository.processBatch = vi.fn(async () => {
      throw new Error(secret);
    });

    await expect(
      runCrmRetentionBatch(
        context(audit as AuditSink),
        { dryRun: false, now },
        repository,
      ),
    ).rejects.toThrow(secret);
    const serializedAudit = JSON.stringify(audit.record.mock.calls);
    expect(serializedAudit).toContain('"errorName":"Error"');
    expect(serializedAudit).not.toContain(secret);
  });
});
