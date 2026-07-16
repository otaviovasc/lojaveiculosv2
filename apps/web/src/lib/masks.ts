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

export function formatBrazilianPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 13);
  const localDigits =
    digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (localDigits.length <= 10) {
    return localDigits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return localDigits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function formatBrazilianZipCode(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
