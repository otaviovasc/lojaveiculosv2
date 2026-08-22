import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import type { InventoryCost } from "../model/operationTypes";
import type { InventoryUnit, InventoryListingDetail } from "../model/types";
import type { InventoryDocument } from "../model/mediaDocumentTypes";
import { costKindLabel, type CostItem } from "./FinanceiroCustosSectionModel";
import type { TransactionItem } from "./FinanceiroCashFlowSection";

export function costToItem(
  cost: InventoryCost,
  documents: readonly InventoryDocument[],
): CostItem {
  const receiptDoc = documents.find(
    (doc) => doc.title === `Recibo Custo: ${cost.id}`,
  );
  return {
    account: cost.description || costKindLabel(cost.kind),
    date: formatDate(cost.costDate),
    dateIso: cost.costDate.slice(0, 10),
    id: cost.id,
    kind: cost.kind,
    kindLabel: costKindLabel(cost.kind),
    status: cost.status,
    value: cost.amountCents,
    voidedAt: cost.voidedAt,
    voidReason: cost.voidReason,
    receipt: receiptDoc
      ? { id: receiptDoc.id, fileName: receiptDoc.fileName }
      : null,
  };
}

export function costToCashFlowItem(cost: InventoryCost): TransactionItem {
  return {
    date: formatDate(cost.costDate),
    description: cost.description || `Custo: ${costKindLabel(cost.kind)}`,
    id: cost.id,
    origin: costKindLabel(cost.kind),
    status: cost.status === "active" ? "Registrado" : "Estornado",
    value: -cost.amountCents,
  };
}

export function summarizeCosts(costs: readonly InventoryCost[]) {
  const activeCosts = activeVehicleCosts(costs);
  if (!activeCosts.length) return "Sem custos ativos para esta unidade.";
  return activeCosts
    .map(
      (cost) => `${costKindLabel(cost.kind)}: ${formatBRL(cost.amountCents)}`,
    )
    .join(" | ");
}

export function sumCosts(costs: readonly InventoryCost[]) {
  return activeVehicleCosts(costs).reduce(
    (sum, cost) => sum + cost.amountCents,
    0,
  );
}

export function sumOrNull(costs: readonly InventoryCost[]) {
  const activeCosts = activeVehicleCosts(costs);
  return activeCosts.length ? sumCosts(activeCosts) : null;
}

export function activeVehicleCosts(costs: readonly InventoryCost[]) {
  return costs.filter((cost) => cost.status === "active");
}

export function formatOptionalBRL(value: number | null) {
  return value === null ? "Não informado" : formatBRL(value);
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatMileage(value: number | null) {
  return value === null
    ? "Não informado"
    : `${value.toLocaleString("pt-BR")} km`;
}

export function formatUnitLabel(unit: InventoryUnit | null) {
  return unit?.stockNumber || unit?.plate || unit?.vin || "Não informado";
}
