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

export type BillingProviderAccount = {
  billingCustomer: BillingProviderCustomerRecord;
  chargePreview: BillingChargePreview;
  subscription: BillingProviderSubscriptionRecord | null;
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

export type BillingProviderRepository = {
  getProviderAccount: (input: {
    billingManagedBy?: "agency" | "store_owner";
    currentActorCanManage?: boolean;
    storeId: string;
    tenantId: string;
  }) => Promise<BillingProviderAccount | null>;
  saveProviderCustomer: (
    input: SaveBillingProviderCustomerInput,
  ) => Promise<BillingProviderCustomerRecord | null>;
  saveProviderSubscription: (
    input: SaveBillingProviderSubscriptionInput,
  ) => Promise<BillingProviderSubscriptionRecord | null>;
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
