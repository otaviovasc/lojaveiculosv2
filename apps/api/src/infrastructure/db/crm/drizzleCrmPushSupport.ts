import { and, eq } from "drizzle-orm";
import { crmPushNotificationOutbox } from "@lojaveiculosv2/db";
import type {
  CrmPushIntent,
  CrmPushIntentLease,
  CrmPushLeaseMutationResult,
} from "../../../domains/crm/ports/crmPushRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export type CrmPushRawRow = Record<string, unknown>;

export function crmPushLeaseConditions(input: {
  intentId: string;
  leaseToken: string;
}) {
  return and(
    eq(crmPushNotificationOutbox.id, input.intentId),
    eq(crmPushNotificationOutbox.state, "processing"),
    eq(crmPushNotificationOutbox.leaseToken, input.leaseToken),
  );
}

export async function updateCrmPushLease(
  db: DrizzleCrmClient,
  input: { intentId: string; leaseToken: string },
  values: Partial<typeof crmPushNotificationOutbox.$inferInsert>,
): Promise<CrmPushLeaseMutationResult> {
  const rows = await db
    .update(crmPushNotificationOutbox)
    .set(values)
    .where(crmPushLeaseConditions(input))
    .returning({ id: crmPushNotificationOutbox.id });
  if (rows.length) return "applied";
  const [row] = await db
    .select({ id: crmPushNotificationOutbox.id })
    .from(crmPushNotificationOutbox)
    .where(eq(crmPushNotificationOutbox.id, input.intentId))
    .limit(1);
  return row ? "stale_lease" : "not_found";
}

export function toCrmPushIntent(row: CrmPushRawRow): CrmPushIntent {
  return {
    attemptCount: numberField(row, "attempt_count"),
    cycleId: stringField(row, "cycle_id"),
    generation: numberField(row, "generation"),
    id: stringField(row, "id"),
    idempotencyKey: stringField(row, "idempotency_key"),
    messageId: stringField(row, "message_id"),
    state: stringField(row, "state") as CrmPushIntent["state"],
    storeId: stringField(row, "store_id"),
    tenantId: stringField(row, "tenant_id"),
    threadId: stringField(row, "thread_id"),
  };
}

export function toCrmPushIntentLease(row: CrmPushRawRow): CrmPushIntentLease {
  return {
    ...toCrmPushIntent(row),
    leaseExpiresAt: dateField(row, "lease_expires_at"),
    leaseToken: stringField(row, "lease_token"),
  };
}

export function sanitizeCrmPushErrorCode(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 120);
  return normalized || "unknown_error";
}

export function asCrmPushRawRows(value: unknown): CrmPushRawRow[] {
  return Array.isArray(value) ? (value as CrmPushRawRow[]) : [];
}

function stringField(row: CrmPushRawRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`CRM push row is missing ${key}.`);
  }
  return value;
}

function numberField(row: CrmPushRawRow, key: string): number {
  const value = Number(row[key]);
  if (!Number.isFinite(value)) {
    throw new Error(`CRM push row has invalid ${key}.`);
  }
  return value;
}

function dateField(row: CrmPushRawRow, key: string): Date {
  const value = row[key];
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`CRM push row has invalid ${key}.`);
  }
  return date;
}
