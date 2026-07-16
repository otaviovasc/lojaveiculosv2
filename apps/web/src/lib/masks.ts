import { formatBrazilianCnpj } from "@lojaveiculosv2/shared";

export { formatBrazilianCnpj };

/** Parse raw input into a numeric string with 2 decimals (e.g. "1500000.00") */
export function parseCurrencyInput(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits);
  return Number.isSafeInteger(cents) ? (cents / 100).toFixed(2) : "";
}

/** Format a numeric string / number as BRL value WITHOUT the R$ prefix (e.g. "1.500.000,00") */
export function formatCurrencyValue(value: string | number): string {
  if (typeof value === "string" && value.trim() === "") return "";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatBrazilianDocument(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return formatBrazilianCpf(digits);
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatBrazilianCpf(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function normalizeBrazilianPhoneDigits(value: string): string {
  const digits = onlyDigits(value);
  const hasCountryCode =
    /^\s*\+55/.test(value) || (digits.length > 11 && digits.startsWith("55"));
  return (hasCountryCode ? digits.slice(2) : digits).slice(0, 11);
}

export function formatBrazilianPhone(value: string): string {
  const localDigits = normalizeBrazilianPhoneDigits(value);
  if (localDigits.length <= 10) {
    return localDigits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return localDigits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function formatBrazilianWhatsappPhone(value: string): string {
  const phone = formatBrazilianPhone(normalizeBrazilianPhoneDigits(value));
  return phone ? `+55 ${phone}` : "";
}

export type MaskableInput = Pick<
  HTMLInputElement,
  "selectionEnd" | "selectionStart" | "setSelectionRange" | "value"
>;

export function applyInputMask(
  input: MaskableInput,
  formatter: (value: string) => string,
): string {
  const originalValue = input.value;
  const originalStart = input.selectionStart ?? originalValue.length;
  const originalEnd = input.selectionEnd ?? originalStart;
  const digitsBeforeStart = countDigits(originalValue.slice(0, originalStart));
  const digitsBeforeEnd = countDigits(originalValue.slice(0, originalEnd));
  const formattedValue = formatter(originalValue);
  const originalDigits = onlyDigits(originalValue);
  const formattedDigits = onlyDigits(formattedValue);
  const preservedDigitsOffset =
    formattedDigits.length > originalDigits.length && originalDigits
      ? Math.max(0, formattedDigits.lastIndexOf(originalDigits))
      : 0;

  input.value = formattedValue;
  input.setSelectionRange(
    findCaretAfterDigits(
      formattedValue,
      preservedDigitsOffset + digitsBeforeStart,
    ),
    findCaretAfterDigits(
      formattedValue,
      preservedDigitsOffset + digitsBeforeEnd,
    ),
  );
  return formattedValue;
}

export function formatBrazilianZipCode(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
}

export function formatBrazilianPixKey(value: string, category: string): string {
  switch (category) {
    case "CPF":
      return formatBrazilianCpf(value);
    case "CNPJ":
      return formatBrazilianCnpj(value);
    case "Celular":
      return formatBrazilianWhatsappPhone(value);
    default:
      return value;
  }
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function countDigits(value: string): number {
  return onlyDigits(value).length;
}

function findCaretAfterDigits(value: string, requestedDigits: number): number {
  const targetDigits = Math.min(requestedDigits, countDigits(value));
  let seenDigits = 0;
  let index = 0;

  while (index < value.length && seenDigits < targetDigits) {
    if (/\d/.test(value[index] ?? "")) seenDigits += 1;
    index += 1;
  }
  while (index < value.length && !/\d/.test(value[index] ?? "")) index += 1;
  return index;
}
