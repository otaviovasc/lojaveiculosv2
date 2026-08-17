// UI-facing types for the store-scoped Credere financing workspace.
//
// Security invariants:
// - These shapes never carry tenant/store scope ids, provider credentials,
//   token/account metadata, or the external Credere Store-Id.
// - Wire parsing lives in apiClient.ts so backend DTO renames adjust centrally.

export type CredereUsableBank = {
  code: string;
  name: string | null;
  status: string | null;
};

export type CredereStoreStatus = {
  configured: boolean;
  mappedStoreAlias: string | null;
  usableBanks: CredereUsableBank[];
};

export type SimulationStatusState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; status: CredereStoreStatus };

export type CredereConnectionSummary = {
  configured: boolean;
  connected: boolean;
  storeMapping: {
    externalStoreAlias?: string | undefined;
    externalStoreId: string;
  } | null;
};

export type CredereOAuthStart = {
  authorizationUrl: string;
  expiresAt?: string | undefined;
};

export type CredereProviderStore = {
  alias?: string | undefined;
  document?: string | undefined;
  externalStoreId: string;
  name?: string | undefined;
  status?: string | undefined;
};

export type CredereStoreMapping = {
  externalStoreAlias?: string | undefined;
  externalStoreId: string;
};

export type CredereRequiredFields = {
  applicant: {
    birthDate: string | null;
    email: string | null;
    hasCnh: boolean | null;
    monthlyIncomeCents: number | null;
    name: string | null;
    phone: string | null;
  } | null;
  applicantKnown: boolean;
  missingFields: string[];
  requirements: Record<string, string[]>;
};

export type CredereApplicantPreflightState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; result: CredereRequiredFields };

export type CredereSimulationCondition = {
  bankCode: string | null;
  bankName: string | null;
  installments: number | null;
  downPaymentCents: number | null;
  firstInstallmentCents: number | null;
  preApprovalStatus: number | null;
  reasonIdentifier: string | null;
  reason: string | null;
  summary: string | null;
  /** Literal provider/bank status. Never reinterpreted as approval. */
  status: string;
  totalAmountCents: number | null;
};

export type CredereSimulation = {
  id: string;
  leadId: string | null;
  listingId: string | null;
  unitId: string | null;
  /** Literal provider status (for example "pending", "completed", "failed"). */
  status: string;
  createdAt: string | null;
  providerRequestId: string | null;
  reason: string | null;
  success: boolean | null;
  conditions: CredereSimulationCondition[];
};

export type CredereSimulationSync = {
  created: number;
  remoteCount: number;
  skipped: number;
  syncedAt: string | null;
  updated: number;
};

export type CredereConsentEvidence = {
  acceptedTerms: boolean;
  /** ISO timestamp captured at the moment of the deliberate acceptance. */
  acceptedAt: string;
  channel: string;
  policyVersion: string;
};

export type CredereApplicantInput = {
  name: string;
  cpfCnpj: string;
  phone: string;
  email?: string | undefined;
  birthDate?: string | undefined;
  hasCnh?: boolean | undefined;
  monthlyIncomeCents?: number | undefined;
};

export type CredereVehicleInput = {
  credereVehicleModelId?: string | undefined;
  fipeCode?: string | undefined;
  priceCents: number;
  manufactureYear: number;
  modelYear: number;
  licensingCity: string;
  licensingUf: string;
  molicarCode: string;
  zeroKm: boolean;
};

export type CredereFipeCandidate = {
  brand: string | null;
  fipeCode: string;
  fuelType: string | null;
  modelId: string;
  molicarCode: string;
  name: string;
  version: string | null;
  yearEnd: number | null;
  yearStart: number | null;
};

export type CredereFipeResolution =
  | { candidate: CredereFipeCandidate; status: "resolved" }
  | {
      candidates: CredereFipeCandidate[];
      status: "ambiguous" | "mismatch";
    }
  | { candidates: []; status: "not_found" };

export type CredereSimulationDraft = {
  accessoryValueCents?: number | undefined;
  applicant: CredereApplicantInput;
  consent: CredereConsentEvidence;
  documentationValueCents?: number | undefined;
  downPaymentCents: number;
  installments: readonly number[];
  insuranceValueCents?: number | undefined;
  leadId?: string | undefined;
  listingId?: string | undefined;
  unitId?: string | undefined;
  requestedBankCodes?: string[] | undefined;
  vehicle: CredereVehicleInput;
};

export type CredereAuth = {
  accessToken?: string | undefined;
  clerkUserId?: string | undefined;
  storeSlug?: string | undefined;
  userEmail?: string | undefined;
  userName?: string | undefined;
};
