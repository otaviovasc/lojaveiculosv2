import type { FinanceEntry } from "./types";
import { formatFinanceCategory } from "./financeBillsFormat";

export function originLabel(origin: string) {
  const labels: Record<string, string> = {
    consorcio: "Consórcio",
    documentation: "Documentação",
    financing: "Financiamento",
    insurance: "Seguro",
    manual: "Manual",
    manual_bonus: "Bônus manual",
    sales_commission: "Venda",
    vehicle_sale: "Venda",
  };
  return labels[origin] ?? titleize(origin);
}

export function entrySellerName(entry: FinanceEntry) {
  const metadataName = metadataString(entry.metadata, "sellerName");
  if (metadataName) return metadataName;
  if (!entry.sellerUserId) return "Sem vendedor vinculado";
  return "Vendedor não identificado";
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
  if (saleId) return "Venda vinculada";
  if (leadId) return "Lead vinculado";
  return formatFinanceCategory(entry.category);
}

export function metadataString(
  metadata: FinanceEntry["metadata"],
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function titleize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
