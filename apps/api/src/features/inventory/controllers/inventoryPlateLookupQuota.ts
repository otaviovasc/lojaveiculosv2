import type { BillingQuotaGuard } from "../../../domains/billing/ports/billingQuotaGuard.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";

export type PlateLookupUsageReservation = {
  finalize: (
    outcome: "provider_failed" | "released" | "succeeded",
    failureCode?: string,
  ) => Promise<void>;
  markStarted: () => Promise<void>;
};

export async function reservePlateLookupUsage({
  context,
  quotaGuard,
}: {
  context: StoreScopedServiceContext;
  quotaGuard?: BillingQuotaGuard | undefined;
}): Promise<PlateLookupUsageReservation | null> {
  if (!quotaGuard) return null;
  if (
    !quotaGuard.reserveUsage ||
    !quotaGuard.markUsageStarted ||
    !quotaGuard.finalizeUsage
  ) {
    await quotaGuard.assertAvailable({
      quotaKey: "plate_lookup",
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
    return null;
  }

  const reserve = quotaGuard.reserveUsage;
  const markStarted = quotaGuard.markUsageStarted;
  const finalize = quotaGuard.finalizeUsage;
  const { reservationId } = await reserve({
    provider: "apibrasil",
    quotaKey: "plate_lookup",
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  return {
    finalize: (outcome, failureCode) =>
      finalize({
        ...(failureCode ? { failureCode } : {}),
        outcome,
        reservationId,
        storeId: context.storeId,
        tenantId: context.tenantId,
      }),
    markStarted: () =>
      markStarted({
        reservationId,
        storeId: context.storeId,
        tenantId: context.tenantId,
      }),
  };
}

export async function releaseUnstartedReservation(
  context: ServiceContext,
  reservation: PlateLookupUsageReservation,
) {
  try {
    await reservation.finalize("released");
  } catch (error) {
    context.logger.error("inventory.enrichment.plate_quota.release_failed", {
      ...createServiceLogMetadata(context),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function finalizeFailedProviderCall(
  context: ServiceContext,
  reservation: PlateLookupUsageReservation,
  providerError: unknown,
) {
  try {
    await reservation.finalize(
      "provider_failed",
      providerError instanceof Error
        ? providerError.name.slice(0, 120)
        : "UnknownError",
    );
  } catch (error) {
    context.logger.error("inventory.enrichment.plate_quota.finalize_failed", {
      ...createServiceLogMetadata(context),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
