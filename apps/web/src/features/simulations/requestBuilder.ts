import type { CredereConsentEvidence, CredereSimulationDraft } from "./types";

/**
 * Scope fields are resolved server-side from the authenticated store context.
 * The client must never send them; drafts containing them are rejected.
 */
export const FORBIDDEN_SCOPE_KEYS = [
  "tenantId",
  "storeId",
  "externalStoreId",
  "credereStoreId",
  "providerStoreId",
] as const;

export type CredereSimulationBody = {
  applicant: {
    name: string;
    document: string;
    phone: string;
    email?: string;
    birthDate?: string;
    hasCnh?: boolean;
    monthlyIncomeCents?: number;
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
    installmentCounts: number[];
    insuranceValueCents?: number;
    processBankSuggestedConditions: true;
    requestedBankCodes?: string[];
  };
  unitId?: string;
  vehicle: {
    credereVehicleModelId?: string;
    fipeCode?: string;
    priceCents: number;
    manufactureYear: number;
    modelYear: number;
    licensingCity: string;
    licensingUf: string;
    molicarCode: string;
    zeroKm: boolean;
  };
};

export function buildCreateSimulationBody(
  draft: CredereSimulationDraft,
): CredereSimulationBody {
  assertNoScopeFields(draft);
  const consent = assertConsent(draft.consent);
  const monthlyIncomeCents = positiveOptionalCents(
    draft.applicant.monthlyIncomeCents,
    "renda mensal",
  );
  const applicant = {
    name: requiredText(draft.applicant.name, "nome do proponente"),
    document: requiredDigits(draft.applicant.cpfCnpj, "CPF/CNPJ do proponente"),
    phone: requiredPhoneDigits(draft.applicant.phone),
    ...(draft.applicant.email?.trim()
      ? { email: draft.applicant.email.trim() }
      : {}),
    ...(draft.applicant.birthDate?.trim()
      ? { birthDate: draft.applicant.birthDate.trim() }
      : {}),
    ...(typeof draft.applicant.hasCnh === "boolean"
      ? { hasCnh: draft.applicant.hasCnh }
      : {}),
    ...(monthlyIncomeCents ? { monthlyIncomeCents } : {}),
  };
  const vehicle = {
    ...(draft.vehicle.credereVehicleModelId?.trim()
      ? { credereVehicleModelId: draft.vehicle.credereVehicleModelId.trim() }
      : {}),
    ...(draft.vehicle.fipeCode?.trim()
      ? { fipeCode: draft.vehicle.fipeCode.trim() }
      : {}),
    priceCents: positiveCents(draft.vehicle.priceCents, "valor do veículo"),
    manufactureYear: requiredYear(draft.vehicle.manufactureYear),
    modelYear: requiredYear(draft.vehicle.modelYear),
    licensingCity: requiredText(
      draft.vehicle.licensingCity,
      "cidade de licenciamento",
    ),
    licensingUf: requiredUf(draft.vehicle.licensingUf),
    molicarCode: requiredText(draft.vehicle.molicarCode, "código Molicar"),
    zeroKm: Boolean(draft.vehicle.zeroKm),
  };

  if (
    !Number.isInteger(draft.downPaymentCents) ||
    draft.downPaymentCents <= 0
  ) {
    throw new Error("Informe um valor de entrada válido.");
  }
  if (draft.downPaymentCents >= vehicle.priceCents) {
    throw new Error("A entrada deve ser menor que o valor do veículo.");
  }
  const installmentCounts = normalizeInstallments(draft.installments);
  const accessoryValueCents = positiveOptionalCents(
    draft.accessoryValueCents,
    "valor de acessórios",
  );
  const documentationValueCents = positiveOptionalCents(
    draft.documentationValueCents,
    "valor de documentação",
  );
  const insuranceValueCents = positiveOptionalCents(
    draft.insuranceValueCents,
    "valor de seguro",
  );

  return {
    applicant,
    consent,
    ...(draft.leadId?.trim() ? { leadId: draft.leadId.trim() } : {}),
    ...(draft.listingId?.trim() ? { listingId: draft.listingId.trim() } : {}),
    terms: {
      ...(accessoryValueCents ? { accessoryValueCents } : {}),
      ...(documentationValueCents ? { documentationValueCents } : {}),
      downPaymentCents: draft.downPaymentCents,
      installmentCounts,
      ...(insuranceValueCents ? { insuranceValueCents } : {}),
      processBankSuggestedConditions: true,
      ...(draft.requestedBankCodes?.length
        ? { requestedBankCodes: [...draft.requestedBankCodes] }
        : {}),
    },
    ...(draft.unitId?.trim() ? { unitId: draft.unitId.trim() } : {}),
    vehicle,
  };
}

/** One key per deliberate submit; retries of the same submit reuse the key. */
export function createIdempotencyKey(
  randomUuid: () => string = defaultRandomUuid,
): string {
  return `credere-sim-${randomUuid()}`;
}

export type CredereIdempotencyOperation = {
  key: string;
  payload: string;
};

export function nextIdempotencyOperation(
  current: CredereIdempotencyOperation | null,
  draft: CredereSimulationDraft,
  generateKey: () => string = createIdempotencyKey,
): CredereIdempotencyOperation {
  const payload = JSON.stringify(buildCreateSimulationBody(draft));
  return current?.payload === payload
    ? current
    : { key: generateKey(), payload };
}

function defaultRandomUuid() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const random = cryptoApi?.getRandomValues
    ? cryptoApi.getRandomValues(new Uint8Array(16))
    : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  return Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function assertConsent(consent: CredereConsentEvidence | undefined) {
  if (!consent || consent.acceptedTerms !== true) {
    throw new Error(
      "É obrigatório registrar o consentimento do proponente antes de simular.",
    );
  }
  if (!consent.acceptedAt.trim()) {
    throw new Error("Consentimento sem data de aceite não é válido.");
  }
  return {
    creditSimulation: true as const,
    personalData: true as const,
  };
}

function assertNoScopeFields(value: unknown, path = "simulação") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoScopeFields(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if ((FORBIDDEN_SCOPE_KEYS as readonly string[]).includes(key)) {
      throw new Error(
        `Campo de escopo proibido na simulação: ${key}. O escopo da loja é resolvido pelo servidor.`,
      );
    }
    assertNoScopeFields(nested, `${path}.${key}`);
  }
}

function requiredText(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Informe o ${label}.`);
  return trimmed;
}

function requiredDigits(value: string, label: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) throw new Error(`Informe o ${label}.`);
  return digits;
}

function requiredPhoneDigits(value: string) {
  const digits = normalizeSimulationPhoneDigits(value);
  if (digits.length < 10 || digits.length > 11) {
    throw new Error("Informe o telefone do proponente.");
  }
  return digits;
}

function normalizeSimulationPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^\s*\+55/.test(value)) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("55")) return digits.slice(2);
  return digits;
}

function positiveCents(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Informe o ${label}.`);
  }
  return value;
}

function positiveOptionalCents(value: number | undefined, label: string) {
  if (value === undefined || value === 0) return undefined;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Informe um ${label} válido.`);
  }
  return value;
}

function normalizeInstallments(values: readonly number[]) {
  const installments = [...new Set(values)];
  if (
    installments.length === 0 ||
    installments.some(
      (value) => !Number.isInteger(value) || value <= 0 || value > 120,
    )
  ) {
    throw new Error("Informe ao menos um prazo válido.");
  }
  return installments.sort((left, right) => left - right);
}

function requiredYear(value: number) {
  if (!Number.isInteger(value) || value < 1900 || value > 2100) {
    throw new Error("Informe o ano do veículo.");
  }
  return value;
}

function requiredUf(value: string) {
  const uf = requiredText(value, "UF de licenciamento").toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) {
    throw new Error("Informe a UF de licenciamento com duas letras.");
  }
  return uf;
}
