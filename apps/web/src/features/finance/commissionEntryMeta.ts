import type { FinanceEntry } from "./types";

export function originLabel(origin: string) {
  const labels: Record<string, string> = {
    consorcio: "Consorcio",
    documentation: "Documentacao",
    financing: "Financiamento",
    insurance: "Seguro",
    manual: "Manual",
    manual_bonus: "Bonus manual",
    sales_commission: "Venda",
    vehicle_sale: "Venda",
  };
  return labels[origin] ?? titleize(origin);
}

export function entrySellerName(entry: FinanceEntry) {
  const metadataName = metadataString(entry.metadata, "sellerName");
  if (metadataName) return metadataName;
  if (!entry.sellerUserId) return "Sem vendedor vinculado";
  return `Vendedor ${entry.sellerUserId.slice(0, 8)}`;
}

export function entryDescription(entry: FinanceEntry) {
  return (
    metadataString(entry.metadata, "notes") ??
    metadataString(entry.metadata, "basis") ??
    metadataString(entry.metadata, "description") ??
    ""
  );
}

export function entryReference(entry: FinanceEntry) {
  const saleId = metadataString(entry.metadata, "saleId");
  const leadId = metadataString(entry.metadata, "leadId");
  if (saleId) return `Venda ${saleId}`;
  if (leadId) return `Lead ${leadId}`;
  return entry.category;
}

export function metadataString(metadata: FinanceEntry["metadata"], key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function titleize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
