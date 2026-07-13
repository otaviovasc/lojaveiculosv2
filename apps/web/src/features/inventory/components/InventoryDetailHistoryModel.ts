import type { InventoryListingDetail } from "../model/types";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";

export type InventoryHistoryEvent = {
  detail: string;
  formattedDate: string;
  id: string;
  occurredAt: string;
  title: string;
};

export function buildInventoryHistoryEvents(
  detail: InventoryListingDetail,
): InventoryHistoryEvent[] {
  const events: Array<Omit<InventoryHistoryEvent, "formattedDate">> = [
    {
      detail: detail.listing.title,
      id: `listing-created-${detail.listing.id}`,
      occurredAt: detail.listing.createdAt,
      title: "Veículo cadastrado",
    },
    ...detail.priceHistory.map((entry) => ({
      detail: `${priceLabel(entry.oldPriceCents)} → ${priceLabel(entry.newPriceCents)}`,
      id: `price-${entry.id}`,
      occurredAt: entry.changedAt,
      title: "Preço do anúncio alterado",
    })),
    ...detail.statusHistory.map((entry) => ({
      detail: `${statusLabel(entry.fromStatus)} → ${statusLabel(entry.toStatus)}`,
      id: `status-${entry.id}`,
      occurredAt: entry.changedAt,
      title:
        entry.target === "listing"
          ? "Status do anúncio alterado"
          : "Status da unidade alterado",
    })),
    ...detail.costs.map((cost) => ({
      detail: `${costKindLabel(cost.kind)} • ${formatPrice(cost.amountCents)}${
        cost.description ? ` • ${cost.description}` : ""
      }`,
      id: `cost-${cost.id}`,
      occurredAt: cost.createdAt,
      title: "Custo registrado",
    })),
    ...detail.documents.map((document) => ({
      detail: document.title,
      id: `document-${document.id}`,
      occurredAt: document.createdAt,
      title: "Documento registrado",
    })),
    ...detail.checklists.map((checklist) => ({
      detail: `${checklist.name} • ${checklistStatusLabel(checklist.status)}`,
      id: `checklist-${checklist.id}`,
      occurredAt: checklist.updatedAt,
      title: "Checklist atualizado",
    })),
  ];

  return events
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .map((event) => ({
      ...event,
      formattedDate: formatHistoryDate(event.occurredAt),
    }));
}

const statusLabels: Record<string, string> = {
  acquired: "Adquirido",
  archived: "Arquivado",
  available: "Disponível",
  delivered: "Entregue",
  draft: "Rascunho",
  inactive: "Inativo",
  in_preparation: "Em preparação",
  published: "Publicado",
  reserved: "Reservado",
  sold: "Vendido",
  sold_out: "Esgotado",
  unpublished: "Despublicado",
};

const costKindLabels: Record<string, string> = {
  acquisition: "Aquisição",
  fee: "Taxa",
  other: "Outro custo",
  preparation: "Preparação",
  repair: "Reparo",
  tax: "Imposto",
  transport: "Transporte",
};

const checklistStatusLabels: Record<string, string> = {
  failed: "Reprovado",
  in_progress: "Em andamento",
  passed: "Concluído",
  pending: "Pendente",
  waived: "Dispensado",
};

function priceLabel(priceCents: number | null) {
  return priceCents === null ? "Sob consulta" : formatPrice(priceCents);
}

function statusLabel(status: string | null) {
  if (status === null) return "Sem status anterior";
  return statusLabels[status] ?? "Status não mapeado";
}

function costKindLabel(kind: string) {
  return costKindLabels[kind] ?? "Custo operacional";
}

function checklistStatusLabel(status: string) {
  return checklistStatusLabels[status] ?? "Status não mapeado";
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
