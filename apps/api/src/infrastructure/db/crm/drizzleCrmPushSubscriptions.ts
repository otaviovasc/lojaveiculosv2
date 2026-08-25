import { and, desc, eq, inArray } from "drizzle-orm";
import {
  crmPushPreferences,
  crmPushSubscriptions,
  storeMemberships,
} from "@lojaveiculosv2/db";
import type {
  CrmPushRepository,
  CrmPushSubscription,
} from "../../../domains/crm/ports/crmPushRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type SubscriptionOperations = Pick<
  CrmPushRepository,
  | "disableInvalidSubscriptions"
  | "disableSubscription"
  | "getSettings"
  | "registerOrTransferSubscription"
  | "setPreference"
>;

export function createCrmPushSubscriptionOperations(
  db: DrizzleCrmClient,
): SubscriptionOperations {
  return {
    async disableInvalidSubscriptions(input) {
      if (!input.subscriptionIds.length) return 0;
      const rows = await db
        .update(crmPushSubscriptions)
        .set({ enabled: false, updatedAt: new Date() })
        .where(
          and(
            inArray(crmPushSubscriptions.subscriptionId, [
              ...input.subscriptionIds,
            ]),
            eq(crmPushSubscriptions.enabled, true),
          ),
        )
        .returning({ id: crmPushSubscriptions.id });
      return rows.length;
    },
    async disableSubscription(input) {
      const rows = await db
        .update(crmPushSubscriptions)
        .set({ enabled: false, updatedAt: new Date() })
        .where(
          and(
            eq(crmPushSubscriptions.subscriptionId, input.subscriptionId),
            eq(crmPushSubscriptions.userId, input.userId),
            eq(crmPushSubscriptions.enabled, true),
          ),
        )
        .returning({ id: crmPushSubscriptions.id });
      return rows.length > 0;
    },
    async getSettings(input) {
      const [membership, preference, subscription] = await Promise.all([
        loadMembership(db, input),
        loadPreference(db, input),
        loadLatestSubscription(db, input.userId),
      ]);
      const preferenceEnabled = preference?.enabled ?? true;
      const activeMembership = membership?.status === "active";
      return {
        enabled:
          activeMembership &&
          preferenceEnabled &&
          Boolean(subscription?.enabled),
        preferenceEnabled,
        subscription: subscription ?? null,
      };
    },
    async registerOrTransferSubscription(input) {
      const [existing] = await db
        .select({ userId: crmPushSubscriptions.userId })
        .from(crmPushSubscriptions)
        .where(eq(crmPushSubscriptions.subscriptionId, input.subscriptionId))
        .limit(1);
      const [row] = await db
        .insert(crmPushSubscriptions)
        .values({
          enabled: true,
          lastSeenAt: input.now,
          subscriptionId: input.subscriptionId,
          userId: input.userId,
        })
        .onConflictDoUpdate({
          set: {
            enabled: true,
            lastSeenAt: input.now,
            updatedAt: input.now,
            userId: input.userId,
          },
          target: crmPushSubscriptions.subscriptionId,
        })
        .returning();
      if (!row)
        throw new Error("CRM push subscription upsert returned no row.");
      return {
        created: !existing,
        subscription: toSubscription(row),
        transferredFromUserId:
          existing && existing.userId !== input.userId ? existing.userId : null,
      };
    },
    async setPreference(input) {
      await db
        .insert(crmPushPreferences)
        .values(input)
        .onConflictDoUpdate({
          set: { enabled: input.enabled, updatedAt: new Date() },
          target: [
            crmPushPreferences.tenantId,
            crmPushPreferences.storeId,
            crmPushPreferences.userId,
          ],
        });
    },
  };
}

function loadMembership(
  db: DrizzleCrmClient,
  input: { tenantId: string; storeId: string; userId: string },
) {
  return db
    .select({ status: storeMemberships.status })
    .from(storeMemberships)
    .where(
      and(
        eq(storeMemberships.tenantId, input.tenantId),
        eq(storeMemberships.storeId, input.storeId),
        eq(storeMemberships.userId, input.userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
}

function loadPreference(
  db: DrizzleCrmClient,
  input: { tenantId: string; storeId: string; userId: string },
) {
  return db
    .select({ enabled: crmPushPreferences.enabled })
    .from(crmPushPreferences)
    .where(
      and(
        eq(crmPushPreferences.tenantId, input.tenantId),
        eq(crmPushPreferences.storeId, input.storeId),
        eq(crmPushPreferences.userId, input.userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
}

function loadLatestSubscription(db: DrizzleCrmClient, userId: string) {
  return db
    .select({
      enabled: crmPushSubscriptions.enabled,
      subscriptionId: crmPushSubscriptions.subscriptionId,
    })
    .from(crmPushSubscriptions)
    .where(eq(crmPushSubscriptions.userId, userId))
    .orderBy(desc(crmPushSubscriptions.lastSeenAt))
    .limit(1)
    .then((rows) => rows[0]);
}

function toSubscription(
  row: typeof crmPushSubscriptions.$inferSelect,
): CrmPushSubscription {
  return {
    enabled: row.enabled,
    lastSeenAt: row.lastSeenAt,
    subscriptionId: row.subscriptionId,
    userId: row.userId,
  };
}
