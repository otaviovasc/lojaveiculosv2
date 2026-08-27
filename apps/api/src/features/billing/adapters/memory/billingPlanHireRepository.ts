import { randomUUID } from "node:crypto";
import { currentBillingCatalog } from "../../../../domains/billing/catalog/currentBillingCatalog.js";
import type {
  BillingPlanQuoteRecord,
  BillingPlanHireRecord,
  BillingPlanHireRepository,
} from "../../../../domains/billing/ports/billingPlanHireRepository.js";

export function createMemoryBillingPlanHireRepository(): BillingPlanHireRepository {
  const hires = new Map<string, BillingPlanHireRecord>();
  const quotes = new Map<string, BillingPlanQuoteRecord>();
  return {
    async approveQuote(input) {
      if (!Number.isSafeInteger(input.quotedCents) || input.quotedCents <= 0) {
        throw new Error("Billing plan quote price is invalid.");
      }
      const quote = quotes.get(input.quoteId);
      if (!quote) throw new Error("Billing plan quote was not found.");
      const approved = {
        ...quote,
        expiresAt: input.expiresAt,
        quotedCents: input.quotedCents,
        status: "approved" as const,
      };
      quotes.set(approved.id, approved);
      return approved;
    },
    async beginCheckoutRequest(input) {
      const current = hires.get(input.hireId);
      if (
        !current ||
        current.storeId !== input.storeId ||
        current.tenantId !== input.tenantId
      ) {
        throw new Error("Billing plan hire was not found.");
      }
      const reclaimable =
        current.status === "payment_pending" &&
        !current.checkoutUrl &&
        !current.providerCheckoutId &&
        !current.providerSubscriptionId &&
        Date.now() - current.updatedAt.getTime() >= 65 * 60 * 1_000;
      if (current.status !== "created" && !reclaimable) {
        return { claimed: false, hire: current };
      }
      const now = new Date();
      const updated: BillingPlanHireRecord = {
        ...current,
        phase: "payment_pending",
        status: "payment_pending",
        updatedAt: now,
      };
      hires.set(current.id, updated);
      return { claimed: true, hire: updated };
    },
    async bindCheckout(input) {
      const current = hires.get(input.hireId);
      if (!current) throw new Error("Billing plan hire was not found.");
      const pending = current.status === "payment_pending";
      const updated: BillingPlanHireRecord = {
        ...current,
        checkoutUrl: input.checkoutUrl,
        phase: pending ? "payment_pending" : "checkout_created",
        providerCheckoutId: input.providerCheckoutId,
        status: pending ? "payment_pending" : "checkout_created",
        updatedAt: new Date(),
      };
      hires.set(updated.id, updated);
      return updated;
    },
    async bindRenewal(input) {
      const current = hires.get(input.hireId);
      if (!current) throw new Error("Billing plan hire was not found.");
      const updated: BillingPlanHireRecord = {
        ...current,
        effectiveAt: input.effectiveAt,
        phase: "payment_pending",
        providerSubscriptionId: input.providerSubscriptionId,
        status: "payment_pending",
        updatedAt: new Date(),
      };
      hires.set(updated.id, updated);
      return updated;
    },
    async failHire(input) {
      const current = hires.get(input.hireId);
      if (!current) return;
      hires.set(input.hireId, {
        ...current,
        failureCode: input.failureCode,
        phase: "reconciliation_failed",
        status: "failed",
        updatedAt: new Date(),
      });
    },
    async findHire(input) {
      const hire = hires.get(input.hireId);
      return hire?.storeId === input.storeId && hire.tenantId === input.tenantId
        ? hire
        : null;
    },
    async prepareHire(input) {
      const existing = [...hires.values()].find(
        (hire) =>
          hire.idempotencyKey === input.idempotencyKey &&
          hire.storeId === input.storeId &&
          hire.tenantId === input.tenantId,
      );
      if (existing) {
        return {
          billingTypes: input.billingTypes,
          created: false,
          customerData: null,
          hire: existing,
          providerTransition: null,
        };
      }
      const plan = currentBillingCatalog.plans.find(
        (candidate) => candidate.id === input.planId,
      );
      if (!plan) throw new Error("Billing plan is unavailable.");
      const now = new Date();
      const checkoutMode =
        plan.monthlyPriceCents === 0
          ? "free"
          : plan.code === "escala"
            ? "quote_required"
            : "checkout";
      const quote = input.quoteId ? quotes.get(input.quoteId) : null;
      if (
        checkoutMode === "quote_required" &&
        (!quote || quote.status !== "approved" || !quote.quotedCents)
      ) {
        throw new Error("An approved server quote is required.");
      }
      const status = checkoutMode === "free" ? "paid_active" : "created";
      const limits = plan.limits as Record<string, unknown>;
      const hire: BillingPlanHireRecord = {
        activatedAt: status === "paid_active" ? now : null,
        catalogVersion: currentBillingCatalog.version,
        checkoutMode,
        checkoutUrl: null,
        completedAt: status === "paid_active" ? now : null,
        createdAt: now,
        effectiveAt: null,
        failureCode: null,
        id: randomUUID(),
        idempotencyKey: input.idempotencyKey,
        phase: status === "paid_active" ? "free_active" : "payment_pending",
        planId: plan.id,
        planSnapshot: {
          code: plan.code,
          name: plan.name,
          selectionRank:
            typeof limits.selectionRank === "number" ? limits.selectionRank : 0,
        },
        providerCheckoutId: null,
        providerPaymentId: null,
        providerSubscriptionId: null,
        quotedCents: quote?.quotedCents ?? plan.monthlyPriceCents,
        status,
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      hires.set(hire.id, hire);
      return {
        billingTypes: input.billingTypes,
        created: true,
        customerData: null,
        hire,
        providerTransition: null,
      };
    },
    async requestQuote(input) {
      const plan = currentBillingCatalog.plans.find(
        (candidate) =>
          candidate.id === input.planId && candidate.code === "escala",
      );
      if (!plan) throw new Error("Escala plan is unavailable.");
      const now = new Date();
      const scopedQuotes = [...quotes.values()].filter(
        (quote) =>
          quote.catalogVersion === currentBillingCatalog.version &&
          quote.planId === plan.id &&
          quote.storeId === input.storeId &&
          quote.tenantId === input.tenantId,
      );
      const existing =
        scopedQuotes.find(
          (quote) =>
            quote.status === "requested" &&
            (!quote.expiresAt || quote.expiresAt > now),
        ) ??
        scopedQuotes.find(
          (quote) =>
            quote.status === "approved" &&
            Boolean(quote.quotedCents && quote.quotedCents > 0) &&
            (!quote.expiresAt || quote.expiresAt > now),
        );
      if (existing) return existing;
      const quote = {
        catalogVersion: currentBillingCatalog.version,
        expiresAt: null,
        id: randomUUID(),
        planId: plan.id,
        quotedCents: null,
        status: "requested" as const,
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
      quotes.set(quote.id, quote);
      return quote;
    },
    async restoreFreeDowngradeCancellation() {},
    async scheduleFreeDowngrade(input) {
      const current = hires.get(input.hireId);
      if (!current) throw new Error("Billing plan hire was not found.");
      const updated: BillingPlanHireRecord = {
        ...current,
        phase: "downgrade_scheduled",
        status: "downgrade_scheduled",
        updatedAt: new Date(),
      };
      hires.set(updated.id, updated);
      return updated;
    },
    async supersedeFreeDowngrade() {
      return { state: "none", targetProviderSubscriptionId: null };
    },
  };
}
