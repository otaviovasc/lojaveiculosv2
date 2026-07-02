import { isValidBrazilianCnpj } from "@lojaveiculosv2/shared";
import { FiscalValidationError } from "./fiscalErrors.js";

export function normalizeFiscalDocumentNumber(
  documentType: "cnpj" | "cpf",
  value: string,
) {
  const digits = value.replace(/\D/g, "");
  if (documentType === "cnpj" && !isValidBrazilianCnpj(digits)) {
    throw new FiscalValidationError("Recipient CNPJ is invalid.", {
      field: "documentNumber",
    });
  }
  if (documentType === "cpf" && !isValidCpfShape(digits)) {
    throw new FiscalValidationError("Recipient CPF is invalid.", {
      field: "documentNumber",
    });
  }
  return digits;
}

export function assertTemplateDescription(template: string) {
  const normalized = template.trim();
  if (!normalized) {
    throw new FiscalValidationError("Template description is required.", {
      field: "descriptionTemplate",
    });
  }
  return normalized;
}

export function stripUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function isValidCpfShape(value: string) {
  return value.length === 11 && !/^(\d)\1+$/.test(value);
}
