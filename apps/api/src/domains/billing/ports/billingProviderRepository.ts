import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { BillingChargePreview } from "./billingRepository.js";
import type {
  PaymentProvider,
  PaymentProviderBillingType,
} from "./paymentProviderGateway.js";

export type BillingProviderCustomerRecord = {
  documentNumber: string | null;
  email: string | null;
  id: string;
  name: string;
  provider: PaymentProvider;
  providerCustomerId: string;
};

export type BillingProviderSubscriptionRecord = {
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  id: string;
  provider: PaymentProvider;
  providerSubscriptionId: string | null;
  status: "active" | "cancelled" | "expired" | "past_due" | "trialing";
};

export type BillingProviderCheckoutRecord = {
  checkoutUrl: string;
  expiresAt: Date | null;
  externalReference: string;
  id: string;
  provider: PaymentProvider;
  providerCheckoutId: string;
  status: "cancelled" | "created" | "expired" | "paid";
  storeId: string | null;
  subscriptionId: string;
  tenantId: string;
};

export type BillingProviderAccount = {
  billingCustomer: BillingProviderCustomerRecord;
  chargePreview: BillingChargePreview;
  subscription: BillingProviderSubscriptionRecord | null;
};

export type GetBillingProviderAccountInput = {
  billingManagedBy?: "agency" | "store_owner";
  currentActorCanManage?: boolean;
  storeId?: StoreId | null;
  tenantId: TenantId;
};

export type SaveBillingProviderCustomerInput = {
  billingCustomerId: string;
  provider: PaymentProvider;
  providerCustomerId: string;
};

export type SaveBillingProviderSubscriptionInput = {
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  status: BillingProviderSubscriptionRecord["status"];
  subscriptionId: string;
};

export type SaveBillingProviderCheckoutInput = {
  callbackUrls: Record<string, string>;
  checkoutUrl: string;
  expiresAt: Date | null;
  externalReference: string;
  provider: PaymentProvider;
  providerCheckoutId: string;
  raw: Record<string, unknown>;
  status: BillingProviderCheckoutRecord["status"];
  storeId: string | null;
  subscriptionId: string;
  tenantId: string;
};

export type BillingProviderRepository = {
  getProviderAccount: (
    input: GetBillingProviderAccountInput,
  ) => Promise<BillingProviderAccount | null>;
  saveProviderCustomer: (
    input: SaveBillingProviderCustomerInput,
  ) => Promise<BillingProviderCustomerRecord | null>;
  saveProviderCheckout: (
    input: SaveBillingProviderCheckoutInput,
  ) => Promise<BillingProviderCheckoutRecord | null>;
  saveProviderSubscription: (
    input: SaveBillingProviderSubscriptionInput,
  ) => Promise<BillingProviderSubscriptionRecord | null>;
};

export type BillingProviderCheckoutSessionResult = {
  checkoutUrl: string;
  expiresAt: string | null;
  externalReference: string;
  provider: PaymentProvider;
  providerCheckoutId: string;
  subscriptionId: string;
};

export type BillingProviderSubscriptionSyncResult = {
  billingType: PaymentProviderBillingType;
  chargeTotalCents: number;
  nextDueDate: string;
  provider: PaymentProvider;
  providerCustomerId: string;
  providerSubscriptionId: string;
  status: BillingProviderSubscriptionRecord["status"];
  subscriptionId: string;
  synchronizedAt: string;
};
