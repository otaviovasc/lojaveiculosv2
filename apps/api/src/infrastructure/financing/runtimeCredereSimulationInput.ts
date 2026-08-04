import { FinancingValidationError } from "../../domains/financing/services/FinancingService/serviceSupport.js";
import type { CreateCredereSimulationInput } from "../../domains/financing/services/FinancingService/types.js";

export function toCredereSimulationInput(
  payload: unknown,
  idempotencyKey: string,
): CreateCredereSimulationInput {
  const record = readRecord(payload);
  const applicant = readRecord(record.applicant);
  const terms = readRecord(record.terms);
  const vehicle = readRecord(record.vehicle);
  const listingId = readString(record.listingId);

  const leadId = readString(record.leadId);
  const unitId = readString(record.unitId);
  const credereVehicleModelId = readString(vehicle.credereVehicleModelId);
  const monthlyIncomeCents = readPositiveNumber(applicant.monthlyIncomeCents);
  const priceCents = requirePositiveNumber(
    vehicle.priceCents,
    "vehicle.priceCents",
  );
  const downPaymentCents = requirePositiveNumber(
    terms.downPaymentCents,
    "terms.downPaymentCents",
  );
  const derivedAmountCents = priceCents - downPaymentCents;
  const requestedAmountCents = readPositiveNumber(terms.financedAmountCents);
  if (
    requestedAmountCents !== undefined &&
    requestedAmountCents !== derivedAmountCents
  ) {
    throw new FinancingValidationError(
      "terms.financedAmountCents must equal vehicle.priceCents minus terms.downPaymentCents.",
    );
  }
  const amountCents = requestedAmountCents ?? derivedAmountCents;
  if (amountCents <= 0) {
    throw new FinancingValidationError(
      "terms.financedAmountCents must be positive after the down payment.",
    );
  }
  return {
    amountCents,
    bankCodes: readStringArray(terms.requestedBankCodes),
    consent: {
      accepted:
        readRecord(record.consent).creditSimulation === true &&
        readRecord(record.consent).personalData === true,
      termsVersion: "credere-simulation-v1",
    },
    customer: {
      document: requireString(applicant.document, "applicant.document"),
      name: requireString(applicant.name, "applicant.name"),
      phone: requireString(applicant.phone, "applicant.phone"),
      ...(typeof applicant.birthDate === "string"
        ? { birthDate: applicant.birthDate }
        : {}),
      ...(typeof applicant.email === "string"
        ? { email: applicant.email }
        : {}),
      ...(monthlyIncomeCents ? { monthlyIncomeCents } : {}),
    },
    downPaymentCents,
    idempotencyKey,
    installments: requirePositiveNumber(
      terms.installmentCount,
      "terms.installmentCount",
    ),
    ...(leadId ? { leadId } : {}),
    ...(listingId ? { listingId } : {}),
    ...(unitId ? { unitId } : {}),
    vehicle: {
      assetValueCents: priceCents,
      ...(credereVehicleModelId ? { credereVehicleModelId } : {}),
      licensingCity: requireString(
        vehicle.licensingCity,
        "vehicle.licensingCity",
      ),
      licensingUf: requireString(vehicle.licensingUf, "vehicle.licensingUf"),
      manufactureYear: requirePositiveNumber(
        vehicle.manufactureYear,
        "vehicle.manufactureYear",
      ),
      modelYear: requirePositiveNumber(vehicle.modelYear, "vehicle.modelYear"),
      vehicleMolicarCode: requireString(
        vehicle.molicarCode,
        "vehicle.molicarCode",
      ),
      zeroKm: vehicle.zeroKm === true,
    },
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireString(value: unknown, field: string) {
  const text = readString(value);
  if (!text) throw new FinancingValidationError(`${field} is required.`);
  return text;
}

function readPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function requirePositiveNumber(value: unknown, field: string) {
  const number = readPositiveNumber(value);
  if (!number) throw new FinancingValidationError(`${field} is required.`);
  return number;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
