import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { PaymentProviderCheckoutBillingType } from "./paymentProviderGateway.js";

export class BillingPlanHireRepositoryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BillingPlanHireRepositoryError";
  }
}

export type BillingPlanHireStatus =
  | "created"
  | "checkout_created"
  | "payment_pending"
  | "activation_pending"
  | "paid_active"
  | "downgrade_scheduled"
  | "cancelled"
  | "expired"
  | "failed"
  | "reconciliation_failed";

export type BillingPhase =
  | "free_active"
  | "checkout_creating"
  | "checkout_created"
  | "payment_pending"
  | "activation_pending"
  | "paid_active"
  | "past_due_grace"
  | "downgrade_scheduled"
  | "checkout_cancelled"
  | "checkout_expired"
  | "checkout_failed"
  | "reconciliation_failed";

export type BillingPlanHireRecord = {
  activatedAt: Date | null;
  catalogVersion: string;
  checkoutMode: "free" | "checkout" | "quote_required";
  checkoutUrl: string | null;
  completedAt: Date | null;
  createdAt: Date;
  effectiveAt: Date | null;
  failureCode: string | null;
  id: string;
  idempotencyKey: string;
  phase: BillingPhase;
  planId: string;
  planSnapshot: {
    code: string;
    name: string;
    selectionRank: number;
  };
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  providerSubscriptionId: string | null;
  quotedCents: number;
  status: BillingPlanHireStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type PreparedBillingPlanHire = {
  billingTypes: readonly PaymentProviderCheckoutBillingType[];
  created: boolean;
  customerData: {
    cpfCnpj: string | null;
    email: string | null;
    name: string;
    phone: string | null;
  } | null;
  hire: BillingPlanHireRecord;
  providerTransition: {
    effectiveAt: Date;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
  } | null;
};

export type BillingPlanQuoteRecord = {
  catalogVersion: string;
  expiresAt: Date | null;
  id: string;
  planId: string;
  quotedCents: number | null;
  status: "approved" | "expired" | "rejected" | "requested" | "used";
  storeId: StoreId;
  tenantId: TenantId;
};

export type BillingPlanHireRepository = {
  approveQuote: (input: {
    actorId: string;
    expiresAt: Date;
    quoteId: string;
    quotedCents: number;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingPlanQuoteRecord>;
  bindCheckout: (input: {
    callbackUrls: Record<string, string>;
    checkoutUrl: string;
    expiresAt: Date | null;
    hireId: string;
    providerCheckoutId: string;
    raw: Record<string, unknown>;
    requestId?: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingPlanHireRecord>;
  bindRenewal: (input: {
    effectiveAt: Date;
    hireId: string;
    providerSubscriptionId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingPlanHireRecord>;
  failHire: (input: {
    failureCode: string;
    hireId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<void>;
  findHire: (input: {
    hireId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingPlanHireRecord | null>;
  prepareHire: (input: {
    actorId: string;
    billingTypes: readonly PaymentProviderCheckoutBillingType[];
    idempotencyKey: string;
    planId: string;
    quoteId?: string;
    requestId?: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<PreparedBillingPlanHire>;
  requestQuote: (input: {
    actorId: string;
    planId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingPlanQuoteRecord>;
  scheduleFreeDowngrade: (input: {
    effectiveAt: Date;
    hireId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingPlanHireRecord>;
};
