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
    monthlyIncomeCents?: number;
  };
  consent: {
    creditSimulation: true;
    personalData: true;
  };
  leadId?: string;
  listingId?: string;
  terms: {
    downPaymentCents: number;
    financedAmountCents?: number;
    installmentCount: number;
    requestedBankCodes?: string[];
  };
  unitId?: string;
  vehicle: {
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
  const applicant = {
    name: requiredText(draft.applicant.name, "nome do proponente"),
    document: requiredDigits(draft.applicant.cpfCnpj, "CPF/CNPJ do proponente"),
    phone: requiredDigits(draft.applicant.phone, "telefone do proponente"),
    ...(draft.applicant.email?.trim()
      ? { email: draft.applicant.email.trim() }
      : {}),
    ...(draft.applicant.birthDate?.trim()
      ? { birthDate: draft.applicant.birthDate.trim() }
      : {}),
    ...(typeof draft.applicant.monthlyIncomeCents === "number"
      ? { monthlyIncomeCents: draft.applicant.monthlyIncomeCents }
      : {}),
  };
  const vehicle = {
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
  if (!Number.isInteger(draft.installments) || draft.installments <= 0) {
    throw new Error("Informe o número de parcelas.");
  }

  return {
    applicant,
    consent,
    ...(draft.leadId?.trim() ? { leadId: draft.leadId.trim() } : {}),
    ...(draft.listingId?.trim() ? { listingId: draft.listingId.trim() } : {}),
    terms: {
      downPaymentCents: draft.downPaymentCents,
      installmentCount: Number(draft.installments),
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

function positiveCents(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Informe o ${label}.`);
  }
  return value;
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
