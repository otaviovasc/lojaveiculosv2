import type {
  InventoryChecklistOverviewStatus,
  InventoryChecklistOverviewScope,
  InventoryChecklistOverviewFilter,
} from "../inventory/model/checklistOverviewTypes";
import type {
  InventoryUnitStatus,
  UpsertInventoryChecklistItemInput,
} from "../inventory/model/types";

export const checklistScopeOptions: readonly {
  label: string;
  value: InventoryChecklistOverviewScope;
}[] = [
  { label: "Estoque ativo", value: "active" },
  { label: "Vendidos e entregues", value: "completed" },
  { label: "Todos os veículos", value: "all" },
];

export const checklistStatusOptions: readonly {
  label: string;
  value: InventoryChecklistOverviewFilter;
}[] = [
  { label: "Todas as situações", value: "all" },
  { label: "Exigem atenção", value: "attention" },
  { label: "Sem checklist", value: "missing" },
  { label: "Com reprovação", value: "failed" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Pendentes", value: "pending" },
  { label: "Concluídos", value: "passed" },
  { label: "Dispensados", value: "waived" },
];

export function checklistOverviewStatusLabel(
  status: InventoryChecklistOverviewStatus,
) {
  return {
    failed: "Com reprovação",
    in_progress: "Em andamento",
    missing: "Sem checklist",
    passed: "Concluído",
    pending: "Pendente",
    waived: "Dispensado",
  }[status];
}

export function checklistOverviewStatusTone(
  status: InventoryChecklistOverviewStatus,
) {
  if (status === "passed") return "success" as const;
  if (status === "failed" || status === "missing") return "danger" as const;
  if (status === "in_progress" || status === "pending")
    return "warning" as const;
  return "neutral" as const;
}

export function checklistItemStatusLabel(
  status: "failed" | "passed" | "pending" | "waived",
) {
  return {
    failed: "Reprovado",
    passed: "Aprovado",
    pending: "Pendente",
    waived: "Dispensado",
  }[status];
}

export function inventoryUnitStatusLabel(status: InventoryUnitStatus) {
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

export function checklistVehicleSubtitle(input: {
  manufactureYear: number | null;
  modelYear: number | null;
  plate: string | null;
  stockNumber: string | null;
}) {
  const year = [input.manufactureYear, input.modelYear]
    .filter(Boolean)
    .join("/");
  return [
    year || null,
    input.plate ? `Placa ${input.plate}` : null,
    input.stockNumber ? `Estoque ${input.stockNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatChecklistDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isChecklistItemResolved(
  item: UpsertInventoryChecklistItemInput,
) {
  return item.status === "passed" || item.status === "waived";
}

export function inventoryUnitStatusTone(status: InventoryUnitStatus) {
  if (status === "available") return "success" as const;
  if (status === "reserved") return "warning" as const;
  if (status === "sold") return "blue" as const;
  if (status === "in_preparation") return "warning" as const;
  if (status === "acquired") return "blue" as const;
  if (status === "delivered") return "neutral" as const;
  if (status === "inactive") return "danger" as const;
  return "neutral" as const;
}
