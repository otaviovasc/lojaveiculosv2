import { sql } from "drizzle-orm";
import type { CrmRetentionRepository } from "../../../domains/crm/ports/crmRetentionRepository.js";
import {
  claimDrizzleCrmRetentionAuditOutbox,
  markDrizzleCrmRetentionAuditOutbox,
} from "./drizzleCrmRetentionAuditOutbox.js";
import { processDrizzleCrmRetentionBatch } from "./drizzleCrmRetentionBatch.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  claimDrizzleCrmRetentionScopes,
  completeDrizzleCrmRetentionScope,
} from "./drizzleCrmRetentionScopes.js";

export const crmRetentionRequiredRelations = [
  "crm_external_bot_action_commands",
  "crm_messages",
  "crm_channel_connections",
  "crm_conversation_attendances",
  "crm_conversation_cycles",
  "crm_conversation_threads",
  "crm_retention_audit_outbox",
  "crm_retention_legal_holds",
  "crm_retention_scopes",
  "crm_external_bot_event_outbox",
  "crm_external_bot_proposals",
  "integration_events",
  "crm_external_bot_provider_effects",
  "provider_events",
] as const;

/**
 * The optional legal-hold store is deliberately fail-closed. Its expected
 * columns are tenant_id, store_id, category, resource_type, resource_id,
 * starts_at, expires_at and released_at. Until that relation is migrated,
 * inspectReadiness blocks both previews and mutations without reading content.
 */
export function createDrizzleCrmRetentionRepository(
  db: DrizzleCrmClient,
): CrmRetentionRepository {
  return {
    claimAuditOutbox: (input) => claimDrizzleCrmRetentionAuditOutbox(db, input),
    claimScopes: (input) => claimDrizzleCrmRetentionScopes(db, input),
    completeScope: (input) => completeDrizzleCrmRetentionScope(db, input),
    async inspectReadiness() {
      const unavailableRelations: string[] = [];
      for (const relation of crmRetentionRequiredRelations) {
        const rows = await db.execute(
          sql`select to_regclass(${`public.${relation}`})::text as relation`,
        );
        const [row] = rows as unknown as Array<{ relation: string | null }>;
        if (!row?.relation) unavailableRelations.push(relation);
      }
      return {
        unavailableRelations,
      };
    },
    markAuditOutbox: (input) => markDrizzleCrmRetentionAuditOutbox(db, input),
    processBatch: (input) => processDrizzleCrmRetentionBatch(db, input),
  };
}
