import type { ServiceContext } from "../../../shared/serviceContext.js";

export type CrmBotPublicFinancingSimulationInput = {
  applicant: {
    birthDate?: string;
    document: string;
    email?: string;
    hasCnh?: boolean;
    monthlyIncomeCents?: number;
    name: string;
    phone: string;
  };
  consent: {
    creditSimulation: true;
    personalData: true;
  };
  leadId?: string;
  listingId?: string;
  terms: {
    accessoryValueCents?: number;
    documentationValueCents?: number;
    downPaymentCents: number;
    financedAmountCents?: number;
    installmentCounts: readonly number[];
    insuranceValueCents?: number;
    processBankSuggestedConditions?: boolean;
    requestedBankCodes?: readonly string[];
  };
  unitId?: string;
  vehicle: {
    licensingCity: string;
    licensingUf: string;
    manufactureYear: number;
    modelYear: number;
    molicarCode: string;
    priceCents: number;
    zeroKm?: boolean;
  };
};

export type CrmFinancingBotResult =
  | null
  | boolean
  | number
  | string
  | CrmFinancingBotResult[]
  | { [key: string]: CrmFinancingBotResult };

export type CrmFinancingBotReadiness = {
  missingRequirements?: readonly string[];
  provider: "credere";
  ready: boolean;
  status: "not_configured" | "ready" | "unavailable";
  usableBankCount?: number;
  usableBanks?: readonly {
    code: string;
    name: string | null;
  }[];
};

export type CrmFinancingCreateSimulationInput = {
  idempotencyKey: string;
  payload: CrmBotPublicFinancingSimulationInput;
};

export type CrmFinancingGetSimulationInput = {
  refresh: boolean;
  uuid: string;
};

export type CrmFinancingBotActions = {
  createSimulation: (
    context: ServiceContext,
    input: CrmFinancingCreateSimulationInput,
  ) => Promise<CrmFinancingBotResult>;
  getSimulation: (
    context: ServiceContext,
    input: CrmFinancingGetSimulationInput,
  ) => Promise<CrmFinancingBotResult>;
  readiness: (context: ServiceContext) => Promise<CrmFinancingBotReadiness>;
};
