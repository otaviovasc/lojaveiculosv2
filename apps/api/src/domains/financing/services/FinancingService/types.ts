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

export type CompleteFinancingOAuthInput =
  { code: string; state: string } | { error: string; state: string };

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
  unavailableBankCount: number;
  unavailableBanks: readonly {
    code: string;
    name: string | null;
    reason: "authorization_required" | "inactive" | "provider_error";
  }[];
};

export type CredereRequiredFieldsResult = {
  applicant: {
    addressZipCode: string | null;
    birthDate: string | null;
    email: string | null;
    genderCode: string | null;
    hasCnh: boolean | null;
    monthlyIncomeCents: number | null;
    name: string | null;
    occupationCode: string | null;
    phone: string | null;
  } | null;
  domains: Record<string, readonly { label: string; value: string }[]>;
  knownLead: boolean;
  missingFields: readonly string[];
  requirements: Record<string, readonly string[]>;
};

export type MapFinancingStoreInput = {
  providerStoreId: string;
  storeId: string;
};

export type CreateCredereSimulationInput = {
  accessoryValueCents?: number;
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
    addressZipCode?: string;
    birthDate?: string;
    document: string;
    email?: string;
    genderCode?: string;
    hasCnh?: boolean;
    monthlyIncomeCents?: number;
    name: string;
    occupationCode?: string;
    phone: string;
  };
  documentationValueCents?: number;
  downPaymentCents: number;
  idempotencyKey?: string;
  installmentCounts: readonly number[];
  insuranceValueCents?: number;
  leadId?: string | null;
  listingId?: string | null;
  unitId?: string | null;
  processBankSuggestedConditions: boolean;
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
