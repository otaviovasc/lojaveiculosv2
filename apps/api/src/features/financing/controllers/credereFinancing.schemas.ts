import { isValidBrazilianCnpj } from "@lojaveiculosv2/shared";
import { z } from "zod";

const nonEmptyString = z.string().trim().min(1).max(256);
const positiveCents = z.number().int().positive();
const idString = z.string().trim().min(1).max(128);
const bankCode = z
  .string()
  .trim()
  .regex(/^\d{3}$/);

export const agencyTenantParamsSchema = z
  .object({ tenantId: idString })
  .strict();

export const agencyStoreMappingParamsSchema = z
  .object({ storeId: idString, tenantId: idString })
  .strict();

export const inquiryParamsSchema = z.object({ inquiryId: idString }).strict();

export const upsertStoreMappingSchema = z
  .object({ externalStoreId: idString })
  .strict();

export const requiredFieldsSchema = z
  .object({ document: brazilianDocumentSchema() })
  .strict();

export const oauthCallbackQuerySchema = z
  .object({
    code: nonEmptyString,
    state: nonEmptyString,
  })
  .strict();

export const createSimulationSchema = z
  .object({
    applicant: z
      .object({
        birthDate: brazilianDateSchema().optional(),
        document: brazilianDocumentSchema(),
        email: z.string().trim().email().max(320).optional(),
        monthlyIncomeCents: positiveCents.optional(),
        name: nonEmptyString,
        phone: phoneSchema(),
      })
      .strict(),
    consent: z
      .object({
        creditSimulation: z.literal(true),
        personalData: z.literal(true),
      })
      .strict(),
    leadId: idString.optional(),
    listingId: idString.optional(),
    terms: z
      .object({
        downPaymentCents: positiveCents,
        financedAmountCents: positiveCents.optional(),
        installmentCount: z.number().int().positive().max(120),
        requestedBankCodes: z.array(bankCode).max(20).optional(),
      })
      .strict(),
    unitId: idString.optional(),
    vehicle: z
      .object({
        licensingCity: nonEmptyString,
        licensingUf: z
          .string()
          .trim()
          .regex(/^[A-Z]{2}$/),
        manufactureYear: yearSchema(),
        modelYear: yearSchema(),
        molicarCode: z.string().trim().min(3).max(32),
        priceCents: positiveCents,
        zeroKm: z.boolean().optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.terms.downPaymentCents >= input.vehicle.priceCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Down payment must be lower than the vehicle price.",
        path: ["terms", "downPaymentCents"],
      });
    }
    if (
      input.terms.financedAmountCents !== undefined &&
      input.terms.financedAmountCents !==
        input.vehicle.priceCents - input.terms.downPaymentCents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Financed amount must equal price minus down payment.",
        path: ["terms", "financedAmountCents"],
      });
    }
  });

export function normalizeBrazilianDocument(value: string) {
  return onlyDigits(value);
}

function brazilianDocumentSchema() {
  return z
    .string()
    .trim()
    .refine((value) => isValidBrazilianDocument(value), {
      message: "Invalid Brazilian CPF/CNPJ.",
    })
    .transform(normalizeBrazilianDocument);
}

function brazilianDateSchema() {
  return z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    });
}

function phoneSchema() {
  return z
    .string()
    .trim()
    .refine((value) => {
      const digits = onlyDigits(value);
      return digits.length >= 10 && digits.length <= 13;
    }, "Phone must have 10 to 13 digits.")
    .transform(onlyDigits);
}

function yearSchema() {
  const nextYear = new Date().getUTCFullYear() + 1;
  return z.number().int().min(1900).max(nextYear);
}

function isValidBrazilianDocument(value: string) {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidBrazilianCnpj(digits);
  return false;
}

function isValidCpf(digits: string) {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  const firstDigit = calculateCpfDigit(digits.slice(0, 9));
  const secondDigit = calculateCpfDigit(`${digits.slice(0, 9)}${firstDigit}`);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function calculateCpfDigit(baseDigits: string) {
  const sum = baseDigits
    .split("")
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * (baseDigits.length + 1 - index),
      0,
    );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
