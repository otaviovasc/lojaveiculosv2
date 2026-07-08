export type PaymentProvider = "asaas";

export type PaymentProviderBillingType =
  "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";

export type PaymentProviderCheckoutBillingType = "CREDIT_CARD" | "PIX";

export type PaymentProviderStatus = {
  configured: boolean;
  missingConfiguration: readonly string[];
  provider: PaymentProvider;
  webhookConfigured: boolean;
};

export type PaymentProviderCustomerInput = {
  documentNumber: string | null;
  email: string | null;
  existingProviderCustomerId?: string | null;
  externalReference: string;
  name: string;
};

export type PaymentProviderCustomerResult = {
  created: boolean;
  provider: PaymentProvider;
  providerCustomerId: string;
};

export type PaymentProviderSubscriptionInput = {
  billingType: PaymentProviderBillingType;
  customerId: string;
  description: string;
  existingProviderSubscriptionId?: string | null;
  externalReference: string;
  nextDueDate: string;
  updatePendingPayments: boolean;
  valueCents: number;
};

export type PaymentProviderSubscriptionResult = {
  created: boolean;
  currentPeriodEnd: Date | null;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  status: "ACTIVE" | "EXPIRED" | "INACTIVE" | "OVERDUE" | "UNKNOWN";
};

export type PaymentProviderCheckoutLineItem = {
  description: string | null;
  name: string;
  quantity: number;
  valueCents: number;
};

export type PaymentProviderCheckoutInput = {
  billingTypes: readonly PaymentProviderCheckoutBillingType[];
  callback: {
    cancelUrl: string;
    expiredUrl: string;
    successUrl: string;
  };
  customerData?: {
    cpfCnpj: string | null;
    email: string | null;
    name: string;
    phone: string | null;
  };
  externalReference: string;
  items: readonly PaymentProviderCheckoutLineItem[];
  minutesToExpire: number;
  nextDueDate: string;
};

export type PaymentProviderCheckoutResult = {
  checkoutUrl: string;
  expiresAt: Date | null;
  externalReference: string;
  provider: PaymentProvider;
  providerCheckoutId: string;
  raw: Record<string, unknown>;
};

export type PaymentProviderGateway = {
  createCheckout?: (
    input: PaymentProviderCheckoutInput,
  ) => Promise<PaymentProviderCheckoutResult>;
  getProviderStatus: () => Promise<PaymentProviderStatus>;
  syncCustomer?: (
    input: PaymentProviderCustomerInput,
  ) => Promise<PaymentProviderCustomerResult>;
  syncSubscription?: (
    input: PaymentProviderSubscriptionInput,
  ) => Promise<PaymentProviderSubscriptionResult>;
  verifyWebhookToken?: (token: string | null) => boolean;
};
