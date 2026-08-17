import type {
  CredereConnectionSummary,
  CredereOAuthStart,
  CredereProviderStore,
  CredereRequiredFields,
  CredereSimulation,
  CredereSimulationCondition,
  CredereSimulationSync,
  CredereStoreStatus,
  CredereStoreMapping,
  CredereUsableBank,
} from "./types";

export function parseStoreStatus(raw: unknown): CredereStoreStatus {
  const record = asRecord(raw);
  return {
    configured: readBoolean(record, ["configured", "isConfigured"]) ?? false,
    mappedStoreAlias: readString(record, [
      "mappedStoreAlias",
      "storeAlias",
      "alias",
    ]),
    usableBanks: readArray(record, ["usableBanks", "banks"]).map(parseBank),
  };
}

export function parseConnection(raw: unknown): CredereConnectionSummary {
  const record = asRecord(raw);
  return {
    configured: readBoolean(record, ["configured"]) ?? false,
    connected: readBoolean(record, ["connected"]) ?? false,
    storeMapping: parseMapping(record?.["storeMapping"]),
  };
}

export function parseOauthStart(raw: unknown): CredereOAuthStart {
  const record = asRecord(raw);
  return {
    authorizationUrl:
      readString(record, ["authorizationUrl", "url", "redirectUrl"]) ?? "",
    expiresAt: readString(record, ["expiresAt"]) ?? undefined,
  };
}

export function parseProviderStores(raw: unknown): CredereProviderStore[] {
  const record = asRecord(raw);
  return readArray(record, ["stores", "items", "data"]).map(parseProviderStore);
}

export function parseStoreMapping(raw: unknown): CredereStoreMapping {
  const record = asRecord(raw);
  return {
    externalStoreAlias: readString(record, ["externalStoreAlias"]) ?? undefined,
    externalStoreId: readString(record, ["externalStoreId", "id"]) ?? "",
  };
}

export function parseRequiredFields(raw: unknown): CredereRequiredFields {
  const record = asRecord(raw);
  const lead = asRecord(record?.["applicant"] ?? record?.["lead"]);
  return {
    applicant: lead
      ? {
          birthDate: readString(lead, ["birthDate", "birthdate"]),
          email: readString(lead, ["email"]),
          hasCnh: readBoolean(lead, ["hasCnh", "has_cnh"]),
          monthlyIncomeCents: readNumber(lead, [
            "monthlyIncomeCents",
            "monthly_income_cents",
          ]),
          name: readString(lead, ["name"]),
          phone: readString(lead, ["phone", "phoneNumber"]),
        }
      : null,
    applicantKnown:
      readBoolean(record, ["knownLead", "applicantKnown", "knownApplicant"]) ??
      lead !== null,
    missingFields: readStringArray(record, ["missingFields", "missing_fields"]),
    requirements: parseRequirements(record?.["requirements"]),
  };
}

export function parseSimulation(raw: unknown): CredereSimulation {
  const record = asRecord(raw) ?? {};
  return {
    id: readString(record, ["inquiryId", "uuid", "id", "simulationId"]) ?? "",
    leadId: readString(record, ["leadId", "lead_id"]),
    leadName: readString(record, ["leadName", "lead_name"]),
    listingId: readString(record, ["listingId", "listing_id"]),
    unitId: readString(record, ["unitId", "unit_id"]),
    vehicleTitle: readString(record, ["vehicleTitle", "vehicle_title"]),
    status: readString(record, ["status"]) ?? "unknown",
    createdAt: readString(record, ["createdAt", "created_at"]),
    providerRequestId: readString(record, [
      "providerRequestId",
      "provider_request_id",
    ]),
    reason: readString(record, ["reason", "reasonMessage"]),
    success: readBoolean(record, ["success"]),
    conditions: readArray(record, ["conditions", "offers"]).map(parseCondition),
  };
}

export function parseSimulationList(raw: unknown): CredereSimulation[] {
  if (Array.isArray(raw)) return raw.map(parseSimulation);
  const record = asRecord(raw);
  return readArray(record, ["simulations", "items", "data"]).map(
    parseSimulation,
  );
}

export function parseSimulationSync(raw: unknown): CredereSimulationSync {
  const record = asRecord(raw);
  return {
    created: readNumber(record, ["created"]) ?? 0,
    remoteCount: readNumber(record, ["remoteCount"]) ?? 0,
    skipped: readNumber(record, ["skipped"]) ?? 0,
    syncedAt: readString(record, ["syncedAt"]),
    updated: readNumber(record, ["updated"]) ?? 0,
  };
}

function parseMapping(raw: unknown) {
  if (!raw) return null;
  const mapping = parseStoreMapping(raw);
  return mapping.externalStoreId ? mapping : null;
}

function parseProviderStore(raw: unknown): CredereProviderStore {
  const record = asRecord(raw) ?? {};
  return {
    alias: readString(record, ["alias"]) ?? undefined,
    document: readString(record, ["document"]) ?? undefined,
    externalStoreId: readString(record, ["externalStoreId", "id"]) ?? "",
    name: readString(record, ["name"]) ?? undefined,
    status: readString(record, ["status"]) ?? undefined,
  };
}

function parseBank(raw: unknown): CredereUsableBank {
  const record = asRecord(raw) ?? {};
  return {
    code: readString(record, ["code", "bankCode", "febrabanCode"]) ?? "unknown",
    name: readString(record, ["name", "bankName", "tradename"]),
    status: readString(record, ["status"]),
  };
}

function parseCondition(raw: unknown): CredereSimulationCondition {
  const record = asRecord(raw) ?? {};
  const metadata = asRecord(record?.["metadata"]) ?? {};
  return {
    bankCode: readString(record, [
      "bankCode",
      "bankFebrabanCode",
      "bank_code",
      "febrabanCode",
    ]),
    bankName: readString(record, ["bankName", "bank", "bank_name"]),
    installments: readNumber(record, [
      "installments",
      "installmentCount",
      "installment_count",
    ]),
    downPaymentCents:
      readNumber(record, [
        "downPaymentCents",
        "down_payment_cents",
        "downPayment",
        "down_payment",
      ]) ?? readNumber(metadata, ["downPaymentCents", "down_payment_cents"]),
    firstInstallmentCents:
      readNumber(record, [
        "firstInstallmentCents",
        "installmentValue",
        "first_installment_cents",
        "installment_value",
      ]) ??
      readNumber(metadata, [
        "firstInstallmentCents",
        "installmentValue",
        "first_installment_cents",
        "installment_value",
      ]),
    preApprovalStatus:
      readNumber(record, ["preApprovalStatus", "pre_approval_status"]) ??
      readNumber(metadata, ["preApprovalStatus", "pre_approval_status"]),
    reasonIdentifier:
      readString(record, ["reasonIdentifier", "reason_identifier"]) ??
      readString(metadata, ["reasonIdentifier", "reason_identifier"]),
    reason:
      readString(record, [
        "reason",
        "reasonMessage",
        "refusal_reason",
        "reasonIdentifier",
      ]) ??
      readString(metadata, ["reason", "refusal_reason", "reasonIdentifier"]),
    status: readString(record, ["status"]) ?? "unknown",
    summary: readString(record, ["summary", "description", "message"]),
    totalAmountCents:
      readNumber(record, [
        "totalAmountCents",
        "totalValue",
        "total_amount_cents",
        "total_amount",
      ]) ??
      readNumber(metadata, [
        "totalAmountCents",
        "totalValue",
        "total_amount_cents",
      ]),
  };
}

function parseRequirements(raw: unknown): Record<string, string[]> {
  const record = asRecord(raw);
  if (!record) return {};
  const requirements: Record<string, string[]> = {};
  for (const [group, fields] of Object.entries(record)) {
    if (!Array.isArray(fields)) continue;
    requirements[group] = fields.filter(
      (field): field is string => typeof field === "string",
    );
  }
  return requirements;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readArray(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): unknown[] {
  for (const key of keys) {
    const value = record?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function readStringArray(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): string[] {
  return readArray(record, keys).filter(
    (value): value is string =>
      typeof value === "string" && Boolean(value.trim()),
  );
}

function readBoolean(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): boolean | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function readNumber(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function readString(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}
