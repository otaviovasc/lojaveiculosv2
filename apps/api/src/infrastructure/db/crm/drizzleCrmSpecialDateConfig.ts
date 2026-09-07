import { and, eq, inArray, sql } from "drizzle-orm";
import {
  crmScheduledMessages,
  crmSpecialDateConfigs,
  crmSpecialDateExecutions,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmSpecialDateConfig,
  CrmSpecialDateRepository,
  UpsertCrmSpecialDateConfigInput,
} from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import {
  specialDateScope,
  toSpecialDateConfig,
  withSpecialDateTransaction,
} from "./drizzleCrmSpecialDateSupport.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function listConfigsByConnection(
  db: DrizzleCrmClient,
  tenantId: TenantId,
  storeId: StoreId,
  connectionId: string,
) {
  const rows = await db
    .select()
    .from(crmSpecialDateConfigs)
    .where(
      and(
        eq(crmSpecialDateConfigs.tenantId, tenantId),
        eq(crmSpecialDateConfigs.storeId, storeId),
        eq(crmSpecialDateConfigs.connectionId, connectionId),
      ),
    );
  return rows.map(toSpecialDateConfig);
}

export async function listEnabledConfigs(
  db: DrizzleCrmClient,
  tenantId: TenantId,
  storeId: StoreId,
) {
  const rows = await db
    .select()
    .from(crmSpecialDateConfigs)
    .where(
      and(
        eq(crmSpecialDateConfigs.tenantId, tenantId),
        eq(crmSpecialDateConfigs.storeId, storeId),
        eq(crmSpecialDateConfigs.enabled, true),
      ),
    );
  return rows.map(toSpecialDateConfig);
}

export async function upsertConfig(
  db: DrizzleCrmClient,
  input: UpsertCrmSpecialDateConfigInput,
  disableTransactions: boolean,
): Promise<CrmSpecialDateConfig> {
  return withSpecialDateTransaction(db, disableTransactions, async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${configLockKey(input)}, 8431))`,
    );
    const [current] = await tx
      .select()
      .from(crmSpecialDateConfigs)
      .where(
        specialDateScope(
          input.tenantId,
          input.storeId,
          input.connectionId,
          input.dateType,
        ),
      )
      .for("update")
      .limit(1);

    if (
      current &&
      input.expectedRevision !== undefined &&
      current.revision !== input.expectedRevision
    ) {
      throw new Error("CRM special date configuration revision conflict.");
    }

    let row: typeof crmSpecialDateConfigs.$inferSelect | undefined;
    if (current) {
      const [updated] = await tx
        .update(crmSpecialDateConfigs)
        .set({
          enabled: input.enabled,
          ...(input.leadDays !== undefined ? { leadDays: input.leadDays } : {}),
          ...(input.messageTemplate !== undefined
            ? { messageTemplate: input.messageTemplate }
            : {}),
          revision: sql`${crmSpecialDateConfigs.revision} + 1`,
          ...(input.sendTime !== undefined ? { sendTime: input.sendTime } : {}),
          updatedAt: new Date(),
        })
        .where(eq(crmSpecialDateConfigs.id, current.id))
        .returning();
      row = updated;
    } else {
      if (input.expectedRevision !== undefined) {
        throw new Error("CRM special date configuration revision conflict.");
      }
      const [created] = await tx
        .insert(crmSpecialDateConfigs)
        .values({
          connectionId: input.connectionId,
          dateType: input.dateType,
          enabled: input.enabled,
          leadDays: input.leadDays ?? 0,
          messageTemplate: input.messageTemplate ?? "",
          sendTime: input.sendTime ?? "09:00",
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .returning();
      row = created;
    }

    if (!row)
      throw new Error("CRM special date configuration was not persisted.");
    if (!row.enabled) await cancelPendingInTransaction(tx, input);
    return toSpecialDateConfig(row);
  });
}

export async function cancelPendingInTransaction(
  db: DrizzleCrmClient,
  input: Pick<
    UpsertCrmSpecialDateConfigInput,
    "connectionId" | "dateType" | "storeId" | "tenantId"
  >,
) {
  const pending = await db
    .select({
      id: crmSpecialDateExecutions.id,
      scheduledMessageId: crmSpecialDateExecutions.scheduledMessageId,
    })
    .from(crmSpecialDateExecutions)
    .where(
      and(
        eq(crmSpecialDateExecutions.tenantId, input.tenantId),
        eq(crmSpecialDateExecutions.storeId, input.storeId),
        eq(crmSpecialDateExecutions.connectionId, input.connectionId),
        eq(crmSpecialDateExecutions.dateType, input.dateType),
        eq(crmSpecialDateExecutions.status, "scheduled"),
      ),
    )
    .for("update");
  if (pending.length === 0) return 0;

  const scheduledIds = pending
    .map((item) => item.scheduledMessageId)
    .filter((id): id is string => Boolean(id));
  if (scheduledIds.length) {
    await db
      .update(crmScheduledMessages)
      .set({
        cancelledAt: new Date(),
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmScheduledMessages.tenantId, input.tenantId),
          eq(crmScheduledMessages.storeId, input.storeId),
          eq(crmScheduledMessages.status, "pending"),
          inArray(crmScheduledMessages.id, scheduledIds),
        ),
      );
  }

  await db
    .update(crmSpecialDateExecutions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(crmSpecialDateExecutions.tenantId, input.tenantId),
        eq(crmSpecialDateExecutions.storeId, input.storeId),
        eq(crmSpecialDateExecutions.connectionId, input.connectionId),
        eq(crmSpecialDateExecutions.dateType, input.dateType),
        eq(crmSpecialDateExecutions.status, "scheduled"),
        inArray(
          crmSpecialDateExecutions.id,
          pending.map((item) => item.id),
        ),
      ),
    );
  return pending.length;
}

function configLockKey(
  input: Pick<
    UpsertCrmSpecialDateConfigInput,
    "connectionId" | "dateType" | "storeId" | "tenantId"
  >,
) {
  return `${input.tenantId}:${input.storeId}:${input.connectionId}:${input.dateType}`;
}

export type SpecialDateConfigRepositoryMethods = Pick<
  CrmSpecialDateRepository,
  | "cancelPendingSpecialDateExecutions"
  | "listConfigsByConnection"
  | "listEnabledConfigs"
  | "upsertConfig"
>;
