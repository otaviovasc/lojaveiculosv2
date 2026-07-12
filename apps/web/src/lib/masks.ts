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
