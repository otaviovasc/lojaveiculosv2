import type { SharedPdfDocument } from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { VehicleStoreBranding } from "../ports/vehicleStoreBrandingReader.js";
import type {
  VehicleChecklistOverview,
  VehicleChecklistOverviewItem,
  VehicleChecklistOverviewStatus,
} from "../readModels/vehicleChecklistOverview.js";

export function buildDetailedDocument(input: {
  branding?: VehicleStoreBranding | undefined;
  overview: VehicleChecklistOverview;
  scopeLabel: string;
  unitReport: boolean;
}): SharedPdfDocument {
  const storeName = input.branding?.name ?? "Loja Veículos";
  const title = input.unitReport
    ? "Checklist do veículo"
    : "Relatório geral de checklists";
  return {
    brand: {
      contactLine: resolveContactLine(input.branding),
      logoText: initials(storeName),
      storeDocument: input.branding?.document ?? undefined,
      storeName,
    },
    clauses: [],
    fields: [
      {
        fields: [
          {
            label: "Veículos",
            value: String(input.overview.summary.unitCount),
          },
          {
            label: "Checklists",
            value: String(input.overview.summary.checklistCount),
          },
          {
            label: "Conclusão real",
            value: `${input.overview.summary.progressPercent}%`,
          },
          {
            label: "Itens pendentes",
            value: String(input.overview.summary.pendingItemCount),
          },
          {
            label: "Itens reprovados",
            value: String(input.overview.summary.failedItemCount),
          },
          {
            label: "Sem checklist",
            value: String(input.overview.summary.missingChecklistUnitCount),
          },
        ],
        title: "Resumo operacional",
      },
      ...input.overview.items.flatMap((item) =>
        itemSections(item, input.unitReport),
      ),
    ],
    intro: `Escopo: ${input.scopeLabel}. Gerado em ${formatDateTime(
      input.overview.generatedAt,
    )}. Itens dispensados contam como resolvidos e permanecem identificados.`,
    signatures: [],
    subtitle: input.unitReport
      ? vehicleIdentification(input.overview.items[0])
      : `${input.overview.summary.unitCount} veículos no recorte selecionado`,
    title,
  };
}

function itemSections(item: VehicleChecklistOverviewItem, detailed: boolean) {
  const overview = {
    fields: [
      { label: "Identificação", value: vehicleIdentification(item) },
      { label: "Estoque", value: unitStatusLabel(item.unit.status) },
      { label: "Situação", value: overviewStatusLabel(item.status) },
      {
        label: "Progresso",
        value: `${item.metrics.resolvedItemCount}/${item.metrics.itemCount} (${item.metrics.progressPercent}%)`,
      },
      { label: "Pendentes", value: String(item.metrics.pendingItemCount) },
      { label: "Reprovados", value: String(item.metrics.failedItemCount) },
      { label: "Atualizado em", value: formatDateTime(item.updatedAt) },
    ],
    title: item.listing.title,
  };
  if (!detailed) return [overview];
  return [
    overview,
    ...item.checklists.map((checklist) => ({
      fields: checklist.items.map((checklistItem) => ({
        label: checklistItem.label,
        value: [
          itemStatusLabel(checklistItem.status),
          checklistItem.notes?.trim() || null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
      title: checklist.name,
    })),
  ];
}

function vehicleIdentification(item: VehicleChecklistOverviewItem | undefined) {
  if (!item) return "Nenhum veículo encontrado";
  const year = [item.listing.manufactureYear, item.listing.modelYear]
    .filter(Boolean)
    .join("/");
  return [
    item.listing.title,
    year || null,
    item.unit.plate ? `Placa ${item.unit.plate}` : null,
    item.unit.stockNumber ? `Estoque ${item.unit.stockNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function resolveContactLine(branding: VehicleStoreBranding | undefined) {
  return (
    (branding?.contactLine ??
      [branding?.phone, branding?.email, branding?.address]
        .filter(Boolean)
        .join(" · ")) ||
    undefined
  );
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("");
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function overviewStatusLabel(status: VehicleChecklistOverviewStatus) {
  return {
    failed: "Com reprovação",
    in_progress: "Em andamento",
    missing: "Sem checklist",
    passed: "Concluído",
    pending: "Pendente",
    waived: "Dispensado",
  }[status];
}

function itemStatusLabel(status: "failed" | "passed" | "pending" | "waived") {
  return {
    failed: "Reprovado",
    passed: "Aprovado",
    pending: "Pendente",
    waived: "Dispensado",
  }[status];
}

export function unitStatusLabel(
  status: VehicleChecklistOverviewItem["unit"]["status"],
) {
  return {
    acquired: "Adquirido",
    available: "Disponível",
    delivered: "Entregue",
    inactive: "Inativo",
    in_preparation: "Em preparação",
    reserved: "Reservado",
    sold: "Vendido",
  }[status];
}
