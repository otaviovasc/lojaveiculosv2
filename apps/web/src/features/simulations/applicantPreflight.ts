import type { CredereRequiredFields } from "./types";
import { isValidBrazilianCnpj } from "@lojaveiculosv2/shared";

export type SupportedApplicantField =
  | "birthDate"
  | "email"
  | "genderCode"
  | "hasCnh"
  | "monthlyIncomeCents"
  | "name"
  | "occupationCode"
  | "phone"
  | "zipCode";

const supportedAliases: Record<string, SupportedApplicantField> = {
  applicant_email: "email",
  applicant_name: "name",
  applicant_phone: "phone",
  birth_date: "birthDate",
  birthdate: "birthDate",
  buyer_email: "email",
  buyer_name: "name",
  buyer_phone: "phone",
  cnh: "hasCnh",
  date_of_birth: "birthDate",
  driver_license: "hasCnh",
  email: "email",
  full_name: "name",
  gender: "genderCode",
  has_cnh: "hasCnh",
  hascnh: "hasCnh",
  income: "monthlyIncomeCents",
  mobile: "phone",
  monthly_income: "monthlyIncomeCents",
  monthly_income_cents: "monthlyIncomeCents",
  monthlyincomecents: "monthlyIncomeCents",
  name: "name",
  phone: "phone",
  phone_number: "phone",
  retrieve_gender: "genderCode",
  retrieve_occupation: "occupationCode",
  salary: "monthlyIncomeCents",
  occupation: "occupationCode",
  address: "zipCode",
  address_zip_code: "zipCode",
  cep: "zipCode",
  zip_code: "zipCode",
};

const alreadyCollectedFields = new Set([
  "accepted_terms",
  "accessory_value_cents",
  "amount_cents",
  "applicant_document",
  "asset_value_cents",
  "bank",
  "bank_code",
  "bank_codes",
  "banks",
  "buyer_document",
  "channel",
  "city",
  "consent",
  "cpf",
  "cpf_cnpj",
  "credere_vehicle_model_id",
  "cnpj",
  "document",
  "document_number",
  "documentation_value_cents",
  "down_payment",
  "down_payment_cents",
  "entry",
  "fipe",
  "fipe_code",
  "installment_counts",
  "installments",
  "insurance_value_cents",
  "lead_document",
  "licensing_city",
  "licensing_uf",
  "manufacture_year",
  "model_year",
  "molicar",
  "molicar_code",
  "neighborhood",
  "number",
  "policy_version",
  "price",
  "price_cents",
  "requested_bank_codes",
  "requested_banks",
  "state",
  "street",
  "term",
  "terms",
  "uf",
  "value",
  "vehicle_molicar_code",
  "vehicle_price",
  "vehicle_value",
  "year_manufacture",
  "year_model",
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

export function applicantRequirementLabel(field: string) {
  const normalized = normalizeFieldName(field).replace(
    /^(applicant|customer|lead)_/,
    "",
  );
  const labels: Record<string, string> = {
    address_city: "cidade do endereço",
    address_line1: "logradouro",
    address_number: "número do endereço",
    address_state: "UF do endereço",
    mother_name: "nome da mãe",
    profession: "profissão",
    retrieve_profession: "profissão",
  };
  return labels[normalized] ?? normalized.replace(/_/g, " ");
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
