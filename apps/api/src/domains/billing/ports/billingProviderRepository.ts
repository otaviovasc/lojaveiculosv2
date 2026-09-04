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
  providerCustomerId: string | null;
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
  storeId: StoreId;
  tenantId: TenantId;
};

export type SaveBillingProviderSubscriptionInput = {
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  expectedProviderSubscriptionId?: string | null;
  expectedStatus?: BillingProviderSubscriptionRecord["status"];
  observationStartedAt?: Date;
  observedAt?: Date;
  provider: PaymentProvider;
  providerSubscriptionId: string | null;
  status: BillingProviderSubscriptionRecord["status"];
  storeId: StoreId;
  subscriptionId: string;
  tenantId: TenantId;
};

export type BillingProviderRepository = {
  getProviderAccount: (
    input: GetBillingProviderAccountInput,
  ) => Promise<BillingProviderAccount | null>;
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
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  status: BillingProviderSubscriptionRecord["status"];
  subscriptionId: string;
  synchronizedAt: string;
};
