import type { CredereRequiredFields } from "./types";
import { isValidBrazilianCnpj } from "@lojaveiculosv2/shared";

export type SupportedApplicantField =
  "birthDate" | "email" | "hasCnh" | "monthlyIncomeCents" | "name" | "phone";

const supportedAliases: Record<string, SupportedApplicantField> = {
  birth_date: "birthDate",
  birthdate: "birthDate",
  email: "email",
  has_cnh: "hasCnh",
  hascnh: "hasCnh",
  monthly_income: "monthlyIncomeCents",
  monthly_income_cents: "monthlyIncomeCents",
  monthlyincomecents: "monthlyIncomeCents",
  name: "name",
  phone: "phone",
  phone_number: "phone",
};

const alreadyCollectedFields = new Set([
  "amount_cents",
  "asset_value_cents",
  "credere_vehicle_model_id",
  "document",
  "down_payment_cents",
  "fipe_code",
  "installments",
  "licensing_city",
  "licensing_uf",
  "manufacture_year",
  "model_year",
  "molicar_code",
  "price_cents",
  "vehicle_molicar_code",
  "zero_km",
]);

export function readApplicantRequirements(result: CredereRequiredFields) {
  const fields = result.missingFields.length
    ? result.missingFields
    : Object.values(result.requirements).flat();
  const supported = new Set<SupportedApplicantField>();
  const unsupported: string[] = [];

  for (const field of fields) {
    const normalized = normalizeFieldName(field);
    const unscoped = normalized.replace(
      /^(applicant|customer|lead|vehicle)_/,
      "",
    );
    const known = supportedAliases[normalized] ?? supportedAliases[unscoped];
    if (known) supported.add(known);
    else if (
      normalized &&
      !alreadyCollectedFields.has(normalized) &&
      !alreadyCollectedFields.has(unscoped) &&
      !unsupported.includes(field)
    ) {
      unsupported.push(field);
    }
  }
  return { supported, unsupported };
}

export function isValidPreflightDocument(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11
    ? isValidCpf(digits)
    : isValidBrazilianCnpj(digits);
}

function isValidCpf(digits: string) {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return (
    calculateDigit(9) === Number(digits[9]) &&
    calculateDigit(10) === Number(digits[10])
  );
}

function normalizeFieldName(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[.\s-]+/g, "_")
    .toLowerCase();
}
