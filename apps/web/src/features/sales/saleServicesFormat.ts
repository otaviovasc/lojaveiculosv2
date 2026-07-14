export function parseCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : null;
}

export function formatCurrency(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });
}

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export function parsePercentage(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const percentage = Number(normalized);
  return Number.isFinite(percentage) ? percentage : null;
}

export function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}
