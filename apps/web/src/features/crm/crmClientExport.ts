import { sourceLabels, statusLabels } from "./crmPipelineConfig";
import type { ProductCrmLead } from "./productCrmTypes";

const csvHeaders = [
  "Nome",
  "Email",
  "Telefone",
  "CPF/CNPJ",
  "Origem",
  "Status",
  "Veículo",
  "Cadastro",
] as const;

export function exportLeadsToCsv(leads: ProductCrmLead[]) {
  if (typeof document === "undefined") return;

  const csv = buildLeadsCsv(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "clientes.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildLeadsCsv(leads: readonly ProductCrmLead[]) {
  const rows = leads.map((lead) => [
    lead.buyerName ?? "Sem nome",
    lead.buyerEmail ?? "",
    lead.buyerPhone ?? "",
    readMetadataString(lead.metadata, "cpf") ??
      readMetadataString(lead.metadata, "cnpj") ??
      "",
    sourceLabels[lead.source],
    statusLabels[lead.status],
    lead.vehicleTitle ?? "",
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
      new Date(lead.createdAt),
    ),
  ]);
  return `\uFEFF${[csvHeaders, ...rows].map(formatCsvRow).join("\r\n")}`;
}

function formatCsvRow(row: readonly string[]) {
  return row.map(formatCsvCell).join(";");
}

function formatCsvCell(value: string) {
  const protectedValue = /^[\t\r=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
