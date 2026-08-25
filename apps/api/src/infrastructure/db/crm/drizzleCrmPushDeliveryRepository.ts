import { and, eq, isNull } from "drizzle-orm";
import {
  conversationCycles,
  conversationThreads,
  crmMessages,
  crmPushNotificationOutbox,
  stores,
} from "@lojaveiculosv2/db";
import type { CrmPushRepository } from "../../../domains/crm/ports/crmPushRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  crmPushLeaseConditions,
  sanitizeCrmPushErrorCode,
  updateCrmPushLease,
} from "./drizzleCrmPushSupport.js";

type DeliveryOperations = Pick<
  CrmPushRepository,
  | "loadDeliveryContext"
  | "markDeadLetter"
  | "markDelivered"
  | "releaseGeneration"
  | "retryDelivery"
>;

export function createCrmPushDeliveryOperations(
  db: DrizzleCrmClient,
): DeliveryOperations {
  return {
    async loadDeliveryContext(input) {
      const [row] = await db
        .select({
          assignedUserId: conversationCycles.assignedUserId,
          buyerName: conversationThreads.customerDisplayName,
          connectionId: conversationThreads.providerConnectionId,
          content: crmMessages.content,
          currentGeneration: conversationCycles.pushNotificationGeneration,
          cycleId: conversationCycles.id,
          messageId: crmMessages.id,
          messageType: crmMessages.messageType,
          profilePhotoUrl: conversationThreads.profilePhotoUrl,
          storeId: stores.id,
          storeSlug: stores.publicSlug,
          tenantId: stores.tenantId,
          threadId: conversationThreads.id,
        })
        .from(conversationCycles)
        .innerJoin(
          conversationThreads,
          and(
            eq(conversationThreads.tenantId, conversationCycles.tenantId),
            eq(conversationThreads.storeId, conversationCycles.storeId),
            eq(conversationThreads.id, conversationCycles.threadId),
          ),
        )
        .innerJoin(
          crmMessages,
          and(
            eq(crmMessages.tenantId, conversationCycles.tenantId),
            eq(crmMessages.storeId, conversationCycles.storeId),
            eq(crmMessages.threadId, conversationCycles.threadId),
            eq(crmMessages.cycleId, conversationCycles.id),
            eq(crmMessages.id, input.messageId),
          ),
        )
        .innerJoin(
          stores,
          and(
            eq(stores.id, conversationCycles.storeId),
            eq(stores.tenantId, conversationCycles.tenantId),
          ),
        )
        .where(
          and(
            eq(conversationCycles.tenantId, input.tenantId),
            eq(conversationCycles.storeId, input.storeId),
            eq(conversationCycles.threadId, input.threadId),
            eq(conversationCycles.id, input.cycleId),
            eq(conversationCycles.state, "active"),
            isNull(crmMessages.deletedAt),
            eq(stores.isDeleted, false),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    markDeadLetter: (input) =>
      updateCrmPushLease(db, input, {
        deadLetteredAt: input.failedAt,
        lastErrorCode: sanitizeCrmPushErrorCode(input.errorCode),
        leaseExpiresAt: null,
        leaseToken: null,
        state: "dead_letter",
        updatedAt: input.failedAt,
      }),
    markDelivered: (input) =>
      updateCrmPushLease(db, input, {
        deliveredAt: input.deliveredAt,
        lastErrorCode: null,
        leaseExpiresAt: null,
        leaseToken: null,
        providerNotificationId: input.providerNotificationId.slice(0, 191),
        state: "delivered",
        updatedAt: input.deliveredAt,
      }),
    async releaseGeneration(input) {
      const rows = await db
        .delete(crmPushNotificationOutbox)
        .where(crmPushLeaseConditions(input))
        .returning({ id: crmPushNotificationOutbox.id });
      void input.reason;
      void input.releasedAt;
      return rows.length
        ? "applied"
        : resolveCrmPushLeaseMiss(db, input.intentId);
    },
    retryDelivery: (input) =>
      updateCrmPushLease(db, input, {
        lastErrorCode: sanitizeCrmPushErrorCode(input.errorCode),
        leaseExpiresAt: null,
        leaseToken: null,
        nextAttemptAt: input.nextAttemptAt,
        state: "pending",
        updatedAt: new Date(),
      }),
  };
}

async function resolveCrmPushLeaseMiss(
  db: DrizzleCrmClient,
  intentId: string,
): Promise<"not_found" | "stale_lease"> {
  const [row] = await db
    .select({ id: crmPushNotificationOutbox.id })
    .from(crmPushNotificationOutbox)
    .where(eq(crmPushNotificationOutbox.id, intentId))
    .limit(1);
  return row ? "stale_lease" : "not_found";
}
