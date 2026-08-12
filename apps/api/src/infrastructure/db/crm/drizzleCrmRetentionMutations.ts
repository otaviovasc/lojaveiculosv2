import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { enqueueCrmRetentionAudit } from "./drizzleCrmRetentionAuditMutation.js";
import { applyCrmBotRetention } from "./drizzleCrmRetentionBotMutations.js";
import { applyCrmContentRetention } from "./drizzleCrmRetentionContentMutations.js";
import { applyCrmLegacyWindowRetention } from "./drizzleCrmRetentionLegacyMutations.js";
import type { DrizzleCrmRetentionMutationInput } from "./drizzleCrmRetentionMutationSupport.js";

export async function applyDrizzleCrmRetentionCandidates(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<{ affected: number; auditId?: string; verified: boolean }> {
  const affected =
    (await applyCrmContentRetention(db, input)) +
    (await applyCrmLegacyWindowRetention(db, input)) +
    (await applyCrmBotRetention(db, input));
  if (affected !== input.candidates.length) {
    throw new Error("CRM retention mutation verification failed.");
  }
  const auditId = await enqueueCrmRetentionAudit(db, input, affected);
  return { affected, ...(auditId ? { auditId } : {}), verified: true };
}
