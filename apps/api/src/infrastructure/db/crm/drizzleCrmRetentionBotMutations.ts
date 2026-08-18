import { and, eq, inArray, sql } from "drizzle-orm";
import {
  crmExternalBotActionCommands,
  crmExternalBotEventOutbox,
  crmExternalBotProposals,
  crmExternalBotProviderEffects,
} from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  retentionCandidateIds,
  type DrizzleCrmRetentionMutationInput,
  withoutActiveRetentionHold,
} from "./drizzleCrmRetentionMutationSupport.js";

export async function applyCrmBotRetention(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  let affected = 0;
  affected += await clearBotCommands(db, input);
  affected += await clearProviderEffects(db, input);
  affected += await clearExternalBotEvents(db, input);
  affected += await clearExternalBotGrants(db, input);
  affected += await clearExternalBotProposals(db, input);
  return affected;
}

async function clearBotCommands(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  const ids = retentionCandidateIds(input, "bot_action_command");
  if (ids.length === 0) return 0;
  const rows = await db
    .update(crmExternalBotActionCommands)
    .set({ input: {}, updatedAt: input.now })
    .where(
      and(
        eq(crmExternalBotActionCommands.tenantId, input.tenantId),
        eq(crmExternalBotActionCommands.storeId, input.storeId),
        inArray(crmExternalBotActionCommands.id, ids),
        sql`${crmExternalBotActionCommands.createdAt} <= ${input.cutoffs.botInteractionBefore}`,
        withoutActiveRetentionHold(
          "bot_interaction",
          "bot_action_command",
          crmExternalBotActionCommands.id,
          input,
        ),
      ),
    )
    .returning({ id: crmExternalBotActionCommands.id });
  return rows.length;
}

async function clearProviderEffects(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  const ids = retentionCandidateIds(input, "provider_effect");
  if (ids.length === 0) return 0;
  const rows = await db
    .update(crmExternalBotProviderEffects)
    .set({ result: {}, updatedAt: input.now })
    .where(
      and(
        eq(crmExternalBotProviderEffects.tenantId, input.tenantId),
        eq(crmExternalBotProviderEffects.storeId, input.storeId),
        inArray(crmExternalBotProviderEffects.id, ids),
        sql`${crmExternalBotProviderEffects.createdAt} <= ${input.cutoffs.botInteractionBefore}`,
        withoutActiveRetentionHold(
          "bot_interaction",
          "provider_effect",
          crmExternalBotProviderEffects.id,
          input,
        ),
      ),
    )
    .returning({ id: crmExternalBotProviderEffects.id });
  return rows.length;
}

async function clearExternalBotEvents(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  const ids = retentionCandidateIds(input, "external_bot_event");
  if (ids.length === 0) return 0;
  const rows = await db
    .update(crmExternalBotEventOutbox)
    .set({ payload: {}, updatedAt: input.now })
    .where(
      and(
        eq(crmExternalBotEventOutbox.tenantId, input.tenantId),
        eq(crmExternalBotEventOutbox.storeId, input.storeId),
        inArray(crmExternalBotEventOutbox.id, ids),
        sql`${crmExternalBotEventOutbox.createdAt} <= ${input.cutoffs.botInteractionBefore}`,
        sql`${crmExternalBotEventOutbox.state} in ('delivered', 'dead_letter')`,
        sql`${crmExternalBotEventOutbox.payload} <> '{}'::jsonb`,
        withoutActiveRetentionHold(
          "bot_interaction",
          "external_bot_event",
          crmExternalBotEventOutbox.id,
          input,
        ),
      ),
    )
    .returning({ id: crmExternalBotEventOutbox.id });
  return rows.length;
}

async function clearExternalBotGrants(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  const ids = retentionCandidateIds(input, "external_bot_grant");
  if (ids.length === 0) return 0;
  const rows = await db
    .update(crmExternalBotEventOutbox)
    .set({
      grantToken: null,
      lastErrorCode: sql`case
        when ${crmExternalBotEventOutbox.grantExpiresAt} <= ${input.now}
        then coalesce(${crmExternalBotEventOutbox.lastErrorCode}, 'grant_expired')
        else ${crmExternalBotEventOutbox.lastErrorCode}
      end`,
      payload: sql`case
        when ${crmExternalBotEventOutbox.grantExpiresAt} <= ${input.now}
        then '{}'::jsonb
        else ${crmExternalBotEventOutbox.payload}
      end`,
      state: sql`case
        when ${crmExternalBotEventOutbox.grantExpiresAt} <= ${input.now}
          and ${crmExternalBotEventOutbox.state} in ('pending', 'processing')
        then 'dead_letter'
        else ${crmExternalBotEventOutbox.state}
      end`,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(crmExternalBotEventOutbox.tenantId, input.tenantId),
        eq(crmExternalBotEventOutbox.storeId, input.storeId),
        inArray(crmExternalBotEventOutbox.id, ids),
        sql`${crmExternalBotEventOutbox.grantToken} is not null`,
        sql`(${crmExternalBotEventOutbox.state} = 'delivered'
          or ${crmExternalBotEventOutbox.grantExpiresAt} <= ${input.now})`,
      ),
    )
    .returning({ id: crmExternalBotEventOutbox.id });
  return rows.length;
}

async function clearExternalBotProposals(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  const ids = retentionCandidateIds(input, "external_bot_proposal");
  if (ids.length === 0) return 0;
  const rows = await db
    .update(crmExternalBotProposals)
    .set({ payload: {}, updatedAt: input.now })
    .where(
      and(
        eq(crmExternalBotProposals.tenantId, input.tenantId),
        eq(crmExternalBotProposals.storeId, input.storeId),
        inArray(crmExternalBotProposals.id, ids),
        sql`${crmExternalBotProposals.createdAt} <= ${input.cutoffs.botInteractionBefore}`,
        sql`${crmExternalBotProposals.payload} <> '{}'::jsonb`,
        withoutActiveRetentionHold(
          "bot_interaction",
          "external_bot_proposal",
          crmExternalBotProposals.id,
          input,
        ),
      ),
    )
    .returning({ id: crmExternalBotProposals.id });
  return rows.length;
}
