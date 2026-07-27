export type FiscalIssuerAddress = {
  additionalInformation?: string | undefined;
  city: { code: number; name: string; state: string };
  district: string;
  number: string;
  postalCode: string;
  street: string;
};

export type FiscalIssuerProfileInput = {
  address: FiscalIssuerAddress;
  cityTaxNumber?: string | undefined;
  economicActivities?:
    | Array<{
        code: string;
        type: "main" | "secondary";
      }>
    | undefined;
  email?: string | undefined;
  federalTaxNumber: string;
  legalName: string;
  name: string;
  phone?: string | undefined;
  simplesNacionalTaxRegime?: string | undefined;
  specialTaxRegime?: string | undefined;
  stateTaxNumber?: string | undefined;
  taxRegime?: string | undefined;
};

export type SpedyCompanySetupResult = {
  apiKey: string | null;
  companyId: string;
  created: boolean;
  profile: Record<string, unknown>;
};

export type SpedyCompanySyncResult = {
  capabilities: Record<string, unknown>;
  certificateExpiresAt: Date | null;
  profile: Record<string, unknown>;
  settings: Record<string, unknown>;
};

export type FiscalProviderAdminGateway = {
  ensureCompany: (
    input: FiscalIssuerProfileInput,
  ) => Promise<SpedyCompanySetupResult>;
  ensureWebhook: () => Promise<{ registered: boolean }>;
  syncCompany: (
    companyId: string,
    companyApiKey: string,
  ) => Promise<SpedyCompanySyncResult>;
  uploadCertificate: (input: {
    certificate: Blob;
    companyId: string;
    password: string;
  }) => Promise<{ expirationAt: Date | null }>;
  verifyWebhookToken: (token: string) => boolean;
};
