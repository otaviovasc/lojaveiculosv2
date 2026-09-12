import type {
  FinancingFipeVehicleCandidate,
  FinancingFipeVehicleLookupInput,
} from "./financingFipeModels.js";
import type { FinancingSimulationCandidate } from "./financingReconciliationModels.js";
import type { FinancingLead } from "./financingLeadModels.js";

export type {
  FinancingFipeVehicleCandidate,
  FinancingFipeVehicleLookupInput,
} from "./financingFipeModels.js";
export type { FinancingSimulationCandidate } from "./financingReconciliationModels.js";
export type { FinancingLead } from "./financingLeadModels.js";

export type FinancingProvider = "credere";
export type FinancingProviderErrorKind =
  | "indeterminate"
  | "invalid_response"
  | "not_configured"
  | "rate_limited"
  | "unauthorized"
  | "unavailable";

export type FinancingGatewayAuthConfig = {
  clientId: string;
  clientSecret: string;
  scope?: string;
};

export type FinancingAuthorizationRequest = {
  redirectUri: string;
  state?: string;
};

export type FinancingTokenSet = {
  accessToken: string;
  expiresAt: Date | null;
  providerAccountId: string | null;
  refreshToken: string | null;
  scope: string | null;
  tokenType: string | null;
};

export type FinancingStore = {
  cnpj: string | null;
  displayName: string | null;
  id: string;
  name: string | null;
  status: string | null;
};

export type FinancingSeller = {
  active: boolean;
  cpf: string;
  id: string;
  name: string;
};

export type FinancingIntegratedBank = {
  active: boolean;
  code: string;
  name: string | null;
  status: string | null;
  tradename: string | null;
};
export type FinancingDomainOption = {
  label: string;
  value: string;
};

export type FinancingLeadAddress = {
  city?: string;
  complement?: string;
  district?: string;
  number?: string;
  state?: string;
  street?: string;
  zipCode?: string;
};

export type FinancingLeadInput = {
  address?: FinancingLeadAddress;
  birthdate?: string;
  cpfCnpj: string;
  email?: string;
  hasCnh?: boolean;
  monthlyIncomeCents?: number;
  name: string;
  phoneNumber: string;
  retrieveGender?: string;
  retrieveOccupation?: string;
  retrieveProfession?: string;
};
export type FinancingRequiredFields = {
  lead: FinancingLead | null;
  requirements: Record<string, string[]>;
};

export type FinancingVehicleModel = {
  active: boolean;
  brand: string | null;
  fipeCode: string | null;
  id: string;
  molicarCode: string | null;
  name: string | null;
  version: string | null;
  yearEnd: number | null;
  yearStart: number | null;
};

export type FinancingVehicleLookupInput = {
  manufactureYear: number;
  modelYear: number;
  query: string;
};

export type FinancingSimulationConditionInput = {
  bankFebrabanCode?: string;
  downPaymentCents: number;
  financedAmountCents?: number;
  installments: number;
};

export type FinancingSimulationInput = {
  accessoryValueCents?: number;
  assetValueCents: number;
  bankFebrabanCodes?: string[];
  commercial?: boolean;
  conditions: FinancingSimulationConditionInput[];
  documentationValueCents?: number;
  insuranceValueCents?: number;
  processBankSuggestedConditions?: boolean;
  retrieveLeadCpfCnpj: string;
  sellerCpf: string;
  vehicle: {
    assetValueCents: number;
    credereVehicleModelId?: string;
    licensingCity: string;
    licensingUf: string;
    manufactureYear: number;
    modelYear: number;
    vehicleMolicarCode?: string;
    zeroKm: boolean;
  };
};

export type FinancingSimulationConditionStatus =
  "available" | "failed" | "pending" | "rejected";

export type FinancingSimulationCondition = {
  available: boolean;
  bankCode: string | null;
  bankName: string | null;
  downPaymentCents: number | null;
  financedAmountCents: number | null;
  firstInstallmentCents: number | null;
  id: string;
  installments: number | null;
  preApprovalStatus: number | null;
  reason: string | null;
  reasonIdentifier: string | null;
  status: FinancingSimulationConditionStatus;
};
export type FinancingSimulationStatus = "completed" | "failed" | "pending";

export type FinancingSimulation = {
  conditions: FinancingSimulationCondition[];
  createdAt: string | null;
  providerRequestId: string | null;
  reason: string | null;
  status: FinancingSimulationStatus;
  success: boolean | null;
  uuid: string;
};

export type StoreScopedFinancingRequest = {
  credereStoreId: string;
  token: FinancingTokenSet;
};

export type FinancingProviderGateway = {
  createAuthorizationUrl: (
    input: FinancingAuthorizationRequest,
  ) => Promise<string>;
  createLead: (
    input: StoreScopedFinancingRequest & { lead: FinancingLeadInput },
  ) => Promise<FinancingLead>;
  createSimulation: (
    input: StoreScopedFinancingRequest & {
      simulation: FinancingSimulationInput;
    },
  ) => Promise<FinancingSimulation>;
  exchangeAuthorizationCode: (input: {
    code: string;
    redirectUri: string;
  }) => Promise<FinancingTokenSet>;
  getLead: (
    input: StoreScopedFinancingRequest & { cpfCnpj: string },
  ) => Promise<FinancingLead | null>;
  getSimulation: (
    input: StoreScopedFinancingRequest & { uuid: string },
  ) => Promise<FinancingSimulation>;
  getRequiredFields: (
    input: StoreScopedFinancingRequest & { cpfCnpj: string },
  ) => Promise<FinancingRequiredFields>;
  listIntegratedBanks: (
    input: StoreScopedFinancingRequest,
  ) => Promise<FinancingIntegratedBank[]>;
  listDomainOptions: (
    input: StoreScopedFinancingRequest & { types: readonly string[] },
  ) => Promise<Record<string, FinancingDomainOption[]>>;
  listSimulationCandidates: (
    input: StoreScopedFinancingRequest & { createdAfter: Date },
  ) => Promise<FinancingSimulationCandidate[]>;
  listSellers: (
    input: StoreScopedFinancingRequest,
  ) => Promise<FinancingSeller[]>;
  listStores: (input: {
    token: FinancingTokenSet;
  }) => Promise<FinancingStore[]>;
  listVehicleModelsByFipe: (
    input: StoreScopedFinancingRequest & FinancingFipeVehicleLookupInput,
  ) => Promise<FinancingFipeVehicleCandidate[]>;
  lookupVehicleModel: (
    input: StoreScopedFinancingRequest & FinancingVehicleLookupInput,
  ) => Promise<FinancingVehicleModel | null>;
  provider: FinancingProvider;
  refreshToken: (refreshToken: string) => Promise<FinancingTokenSet>;
  revokeToken: (accessToken: string) => Promise<void>;
  updateLead: (
    input: StoreScopedFinancingRequest & {
      cpfCnpj: string;
      lead: FinancingLeadInput;
    },
  ) => Promise<FinancingLead>;
};

export class FinancingProviderGatewayError extends Error {
  constructor(
    readonly kind: FinancingProviderErrorKind,
    message: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "FinancingProviderGatewayError";
  }
}
