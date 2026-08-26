import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { billingQuotaUsageReservations } from "@lojaveiculosv2/db";
import {
  BillingQuotaExceededError,
  type BillingQuotaGuard,
  type BillingQuotaKey,
} from "../../../domains/billing/ports/billingQuotaGuard.js";
import type { DrizzleBillingQuotaClient } from "./drizzleBillingQuotaGuard.js";
import { countBillingQuotaUsage } from "./drizzleBillingQuotaUsage.js";

type ReservationMethods = Required<
  Pick<BillingQuotaGuard, "finalizeUsage" | "markUsageStarted" | "reserveUsage">
>;

export function createDrizzleBillingQuotaReservationMethods(
  db: DrizzleBillingQuotaClient,
  now: () => Date,
  resolveLimit: (
    db: DrizzleBillingQuotaClient,
    input: { quotaKey: BillingQuotaKey; storeId: string; tenantId: string },
    checkedAt: Date,
  ) => Promise<number | null>,
): ReservationMethods {
  return {
    async reserveUsage(input) {
      if (input.quotaKey !== "plate_lookup") {
        throw new Error(
          `Durable quota reservations are unsupported for ${input.quotaKey}.`,
        );
      }
      if ((input.increment ?? 1) !== 1) {
        throw new Error(
          "Plate lookup quota reservations must increment by one.",
        );
      }
      const checkedAt = now();
      const usageWindow = resolveQuotaUsageWindow(input.quotaKey, checkedAt);
      if (!usageWindow)
        throw new Error("Plate lookup quota window is missing.");

      return db.transaction(async (transaction) => {
        const tx = transaction as unknown as DrizzleBillingQuotaClient;
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:${input.quotaKey}:${usageWindow.start.toISOString()}`}, 29))`,
        );
        const limit = await resolveLimit(tx, input, checkedAt);
        const current = await countBillingQuotaUsage(tx, input, usageWindow);
        if (limit !== null && current + 1 > limit) {
          throw new BillingQuotaExceededError({
            current,
            limit,
            quotaKey: input.quotaKey,
          });
        }
        const [reservation] = await tx
          .insert(billingQuotaUsageReservations)
          .values({
            periodStart: usageWindow.start,
            provider: input.provider,
            quotaKey: input.quotaKey,
            requestId: input.requestId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          })
          .returning({ id: billingQuotaUsageReservations.id });
        if (!reservation) throw new Error("Billing quota reservation failed.");
        return { reservationId: reservation.id };
      });
    },
    async markUsageStarted(input) {
      const startedAt = now();
      const [reservation] = await db
        .update(billingQuotaUsageReservations)
        .set({ providerCallStartedAt: startedAt, updatedAt: startedAt })
        .where(
          and(
            eq(billingQuotaUsageReservations.id, input.reservationId),
            eq(billingQuotaUsageReservations.storeId, input.storeId),
            eq(billingQuotaUsageReservations.tenantId, input.tenantId),
            eq(billingQuotaUsageReservations.status, "reserved"),
            isNull(billingQuotaUsageReservations.providerCallStartedAt),
          ),
        )
        .returning({ id: billingQuotaUsageReservations.id });
      if (reservation) return;
      const existing = await findQuotaReservation(db, input);
      if (existing?.status === "reserved" && existing.providerCallStartedAt) {
        return;
      }
      throw new Error("Billing quota reservation cannot start provider I/O.");
    },
    async finalizeUsage(input) {
      const finalizedAt = now();
      const providerCallCondition =
        input.outcome === "released"
          ? isNull(billingQuotaUsageReservations.providerCallStartedAt)
          : isNotNull(billingQuotaUsageReservations.providerCallStartedAt);
      const [reservation] = await db
        .update(billingQuotaUsageReservations)
        .set({
          failureCode:
            input.outcome === "provider_failed"
              ? (input.failureCode ?? "provider_failed")
              : null,
          finalizedAt,
          status: input.outcome,
          updatedAt: finalizedAt,
        })
        .where(
          and(
            eq(billingQuotaUsageReservations.id, input.reservationId),
            eq(billingQuotaUsageReservations.storeId, input.storeId),
            eq(billingQuotaUsageReservations.tenantId, input.tenantId),
            eq(billingQuotaUsageReservations.status, "reserved"),
            providerCallCondition,
          ),
        )
        .returning({ id: billingQuotaUsageReservations.id });
      if (reservation) return;
      const existing = await findQuotaReservation(db, input);
      if (existing?.status === input.outcome) return;
      throw new Error("Billing quota reservation cannot be finalized.");
    },
  };
}

export function resolveQuotaUsageWindow(
  quotaKey: BillingQuotaKey,
  checkedAt: Date,
): { end: Date; start: Date } | null {
  if (quotaKey !== "plate_lookup") return null;
  const year = checkedAt.getUTCFullYear();
  const month = checkedAt.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

async function findQuotaReservation(
  db: DrizzleBillingQuotaClient,
  input: { reservationId: string; storeId: string; tenantId: string },
) {
  const [reservation] = await db
    .select({
      providerCallStartedAt:
        billingQuotaUsageReservations.providerCallStartedAt,
      status: billingQuotaUsageReservations.status,
    })
    .from(billingQuotaUsageReservations)
    .where(
      and(
        eq(billingQuotaUsageReservations.id, input.reservationId),
        eq(billingQuotaUsageReservations.storeId, input.storeId),
        eq(billingQuotaUsageReservations.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return reservation;
}
