export type PaymentProvider = "asaas";

export type PaymentProviderStatus = {
  configured: boolean;
  missingConfiguration: readonly string[];
  provider: PaymentProvider;
  webhookConfigured: boolean;
};

export type PaymentProviderGateway = {
  getProviderStatus: () => Promise<PaymentProviderStatus>;
};
