import { sql } from "drizzle-orm";
import type {
  CrmRetentionCategory,
  CrmRetentionCategoryResult,
  ProcessCrmRetentionBatchInput,
  ProcessCrmRetentionBatchResult,
} from "../../../domains/crm/ports/crmRetentionRepository.js";
import { listDrizzleCrmRetentionCandidates } from "./drizzleCrmRetentionCandidates.js";
import {
  decodeCrmRetentionCursor,
  encodeCrmRetentionCursor,
} from "./drizzleCrmRetentionCursor.js";
import { applyDrizzleCrmRetentionCandidates } from "./drizzleCrmRetentionMutations.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function processDrizzleCrmRetentionBatch(
  db: DrizzleCrmClient,
  input: ProcessCrmRetentionBatchInput,
): Promise<ProcessCrmRetentionBatchResult> {
  const cursor = decodeCrmRetentionCursor(input.cursor);
  const process = async (client: DrizzleCrmClient) => {
    const coverage = await client.execute(sql`
      select coalesce(sum(unreconciled_rows), 0)::integer as gaps
      from crm_retention_legacy_coverage
      where tenant_id = ${input.scope.tenantId}::uuid
        and store_id = ${input.scope.storeId}::uuid
    `);
    const [coverageRow] = coverage as unknown as Array<{ gaps: number }>;
    const legacyCoverageGaps = Number(coverageRow?.gaps ?? 0);
    const listed = await listDrizzleCrmRetentionCandidates(client, {
      botCutoff: input.cutoffs.botInteractionBefore,
      canonicalCutoff: input.cutoffs.canonicalMessageBefore,
      cursor,
      includeLegacyWindow: legacyCoverageGaps === 0,
      limit: input.limit + 1,
      now: input.now,
      providerCutoff: input.cutoffs.providerRawPayloadBefore,
      storeId: input.scope.storeId,
      tenantId: input.scope.tenantId,
    });
    const page = listed.slice(0, input.limit);
    const actionable = page.filter((candidate) => !candidate.held);
    const legalHoldSkipped = page.length - actionable.length;
    const mutation = input.dryRun
      ? { affected: 0, verified: true }
      : await applyDrizzleCrmRetentionCandidates(client, {
          auditIntent: input.auditIntent,
          candidates: actionable,
          cutoffs: input.cutoffs,
          legalHoldSkipped,
          now: input.now,
          storeId: input.scope.storeId,
          tenantId: input.scope.tenantId,
        });
    return {
      ...(mutation.auditId ? { auditId: mutation.auditId } : {}),
      categories: categoryResults(actionable, input.dryRun),
      legalHoldSkipped,
      legacyCoverageGaps,
      nextCursor:
        listed.length > input.limit && page.length > 0
          ? encodeCrmRetentionCursor(page[page.length - 1]!)
          : null,
      verified: mutation.verified,
    };
  };
  if (input.dryRun) return process(db);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.scope.tenantId}:${input.scope.storeId}`}, 7319))`,
    );
    return process(tx as DrizzleCrmClient);
  });
}

function categoryResults(
  candidates: readonly { category: CrmRetentionCategory }[],
  dryRun: boolean,
): CrmRetentionCategoryResult[] {
  return (
    [
      ["canonical_message", "anonymize"],
      ["provider_raw_payload", "purge"],
      ["bot_interaction", "purge"],
    ] as const
  ).map(([category, action]) => {
    const eligible = candidates.filter(
      (candidate) => candidate.category === category,
    ).length;
    return {
      action,
      affected: dryRun ? 0 : eligible,
      category,
      eligible,
    };
  });
}
