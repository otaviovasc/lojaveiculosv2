import type { FinancingProvider } from "../../ports/financingRepository.js";

export type FinancingConnectionOverview = {
  connected: boolean;
  connectedAt: Date | null;
  mappedStoreCount: number;
  provider: FinancingProvider;
  providerAccountId: string | null;
  status: string;
  storeMappings: readonly {
    externalStoreAlias: string | null;
    externalStoreId: string;
    storeId: string;
  }[];
};

export type StartFinancingOAuthResult = {
  authorizationUrl: string;
  callbackUri: string;
  expiresAt: Date;
  state: string;
  usesPkce: boolean;
};

export type CompleteFinancingOAuthInput = { code: string; state: string };

export type FinancingReadiness = {
  canCreateSimulation: boolean;
  configured: boolean;
  connected: boolean;
  mapped: boolean;
  mappedStoreAlias: string | null;
  provider: FinancingProvider;
  requiredFields: readonly string[];
  usableBankCount: number;
  usableBanks: readonly { code: string; name: string | null }[];
};

export type CredereRequiredFieldsResult = {
  knownLead: boolean;
  missingFields: readonly string[];
  requirements: Record<string, readonly string[]>;
};

export type MapFinancingStoreInput = {
  providerStoreId: string;
  storeId: string;
};

export type CreateCredereSimulationInput = {
  amountCents: number;
  bankCodes?: readonly string[];
  consent: {
    accepted: boolean;
    acceptedAt?: Date;
    ipAddress?: string | null;
    termsVersion: string;
    userAgent?: string | null;
  };
  customer: {
    birthDate?: string;
    document: string;
    email?: string;
    monthlyIncomeCents?: number;
    name: string;
    phone: string;
  };
  downPaymentCents: number;
  idempotencyKey?: string;
  installments: number;
  leadId?: string | null;
  listingId?: string | null;
  unitId?: string | null;
  vehicle: {
    assetValueCents: number;
    credereVehicleModelId?: string;
    fipeCode?: string;
    licensingCity: string;
    licensingUf: string;
    manufactureYear: number;
    modelYear: number;
    vehicleMolicarCode?: string;
    zeroKm: boolean;
  };
};
