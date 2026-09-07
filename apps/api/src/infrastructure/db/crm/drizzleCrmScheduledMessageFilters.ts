import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  crmCampaigns,
  crmSpecialDateConfigs,
  crmScheduledMessages,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type { UpdateCrmScheduledMessageInput } from "../../../domains/crm/ports/crmConversationRepository.js";
import {
  CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY,
  SCHEDULED_CLAIM_TOKEN_KEY,
  SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY,
} from "../../../domains/crm/messaging/crmScheduledMessageScheduling.js";

export function dueScheduledPredicate(
  dueAt: Date,
  staleBefore: Date,
  now = new Date(),
) {
  return or(
    and(
      eq(crmScheduledMessages.status, "pending"),
      lte(crmScheduledMessages.scheduledAt, dueAt),
    ),
    and(
      eq(crmScheduledMessages.status, "sending"),
      lte(crmScheduledMessages.updatedAt, staleBefore),
      scheduledDeliveryRetryPredicate(now),
    ),
  );
}

export function campaignBookkeepingPendingPredicate(
  pending = true,
  now?: Date,
) {
  const pendingFilter = pending
    ? sql`coalesce(${crmScheduledMessages.metadata}->>'campaignBookkeepingPending', 'false') = 'true'`
    : sql`coalesce(${crmScheduledMessages.metadata}->>'campaignBookkeepingPending', 'false') <> 'true'`;
  if (!pending || !now) return pendingFilter;
  return and(pendingFilter, campaignBookkeepingRetryPredicate(now));
}

function campaignBookkeepingRetryPredicate(now: Date) {
  return sql`(
    ${crmScheduledMessages.metadata}->>'${sql.raw(CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY)}' IS NULL
    OR (
      ${crmScheduledMessages.metadata}->>'${sql.raw(CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY)}' ~ '^\\d{4}-\\d{2}-\\d{2}T'
      AND (${crmScheduledMessages.metadata}->>'${sql.raw(CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY)}')::timestamptz <= ${now.toISOString()}
    )
  )`;
}

function scheduledDeliveryRetryPredicate(now: Date) {
  return sql`(
    ${crmScheduledMessages.metadata}->>'${sql.raw(SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY)}' IS NULL
    OR (
      (${crmScheduledMessages.metadata}->>'${sql.raw(SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY)}') ~ '^\\d{4}-\\d{2}-\\d{2}T'
      AND (${crmScheduledMessages.metadata}->>'${sql.raw(SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY)}')::timestamptz <= ${now.toISOString()}
    )
  )`;
}

export function activeCampaignJoin() {
  return and(
    eq(crmCampaigns.id, crmScheduledMessages.campaignId),
    eq(crmCampaigns.storeId, crmScheduledMessages.storeId),
    eq(crmCampaigns.tenantId, crmScheduledMessages.tenantId),
  );
}

export function processableCampaignPredicate() {
  return or(
    isNull(crmScheduledMessages.campaignId),
    and(isNotNull(crmCampaigns.id), eq(crmCampaigns.status, "scheduled")),
  );
}

/**
 * A stale sending claim is already an in-flight delivery. Let the durable
 * scheduled:id outbound intent replay or reconcile it even if an operator
 * paused the campaign after the provider accepted the request. Pending rows
 * still require an active scheduled campaign.
 */
export function processableScheduledMessagePredicate() {
  return or(
    eq(crmScheduledMessages.status, "sending"),
    processableCampaignPredicate(),
  );
}

export function processableSpecialDatePredicate(
  configs?: readonly { id: string; revision: number }[],
) {
  if (!configs) {
    return or(
      eq(crmScheduledMessages.status, "sending"),
      sql`${crmScheduledMessages.metadata}->'specialDate' IS NULL`,
      and(
        eq(crmSpecialDateConfigs.enabled, true),
        sql`${crmSpecialDateConfigs.revision}::text = ${crmScheduledMessages.metadata}->'specialDate'->>'configRevision'`,
      ),
    );
  }
  const validSchedules = configs.map((config) =>
    and(
      sql`${crmScheduledMessages.metadata}->'specialDate'->>'configId' = ${config.id}`,
      sql`${crmScheduledMessages.metadata}->'specialDate'->>'configRevision' = ${String(config.revision)}`,
    ),
  );
  return or(
    eq(crmScheduledMessages.status, "sending"),
    sql`${crmScheduledMessages.metadata}->'specialDate' IS NULL`,
    ...validSchedules,
  );
}

export function specialDateConfigJoin() {
  return and(
    sql`${crmSpecialDateConfigs.id}::text = ${crmScheduledMessages.metadata}->'specialDate'->>'configId'`,
    eq(crmSpecialDateConfigs.storeId, crmScheduledMessages.storeId),
    eq(crmSpecialDateConfigs.tenantId, crmScheduledMessages.tenantId),
  );
}

export function activeCrmEntitlementJoin(now: Date) {
  return and(
    eq(storeEntitlements.storeId, crmScheduledMessages.storeId),
    eq(storeEntitlements.tenantId, crmScheduledMessages.tenantId),
    eq(storeEntitlements.featureKey, "crm"),
    eq(storeEntitlements.status, "active"),
    or(
      isNull(storeEntitlements.startsAt),
      lte(storeEntitlements.startsAt, now),
    ),
    or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
  );
}

export function activeStoreJoin() {
  return and(
    eq(stores.id, crmScheduledMessages.storeId),
    eq(stores.tenantId, crmScheduledMessages.tenantId),
    eq(stores.isDeleted, false),
    isNull(stores.deletedAt),
  );
}

export function activeTenantJoin() {
  return and(
    eq(tenants.id, crmScheduledMessages.tenantId),
    eq(tenants.isDeleted, false),
    isNull(tenants.deletedAt),
  );
}

export function buildScheduledMessageUpdateFilters(
  input: UpdateCrmScheduledMessageInput,
): SQL[] {
  const filters: SQL[] = [
    eq(crmScheduledMessages.id, input.id),
    eq(crmScheduledMessages.storeId, input.storeId),
    eq(crmScheduledMessages.tenantId, input.tenantId),
  ];
  if (input.expectedStatus) {
    filters.push(eq(crmScheduledMessages.status, input.expectedStatus));
  }
  if (input.expectedStatuses?.length) {
    if (input.staleBefore) {
      const retryableStates: SQL[] = [];
      if (input.expectedStatuses.includes("pending")) {
        retryableStates.push(eq(crmScheduledMessages.status, "pending"));
      }
      if (input.expectedStatuses.includes("sending")) {
        retryableStates.push(
          and(
            eq(crmScheduledMessages.status, "sending"),
            lte(crmScheduledMessages.updatedAt, input.staleBefore),
            scheduledDeliveryRetryPredicate(input.now ?? new Date()),
          )!,
        );
      }
      if (retryableStates.length) filters.push(or(...retryableStates)!);
      else filters.push(sql`false`);
    } else {
      filters.push(
        inArray(crmScheduledMessages.status, [...input.expectedStatuses]),
      );
    }
  }
  if (input.dueAt) {
    filters.push(
      or(
        lte(crmScheduledMessages.scheduledAt, input.dueAt),
        eq(crmScheduledMessages.status, "sending"),
      )!,
    );
  }
  if (input.expectedUpdatedAt) {
    if (input.expectedStatuses?.length) {
      // PostgreSQL's now() default retains microseconds while the domain Date
      // is millisecond precision. The initial claim uses the status/lease
      // fence together with a normalized snapshot; all owner writes below
      // remain exact and also carry the durable claim token.
      filters.push(
        sql`date_trunc('milliseconds', ${crmScheduledMessages.updatedAt}) = date_trunc('milliseconds', ${input.expectedUpdatedAt.toISOString()}::timestamptz)`,
      );
    } else {
      // Keep completion/failure writes fenced by the exact revision returned
      // by the claim. Millisecond truncation would let two same-millisecond
      // owners overwrite one another.
      filters.push(eq(crmScheduledMessages.updatedAt, input.expectedUpdatedAt));
    }
  }
  if (input.expectedClaimToken) {
    filters.push(
      sql`${crmScheduledMessages.metadata}->>'${sql.raw(SCHEDULED_CLAIM_TOKEN_KEY)}' = ${input.expectedClaimToken}`,
    );
  }
  return filters;
}
