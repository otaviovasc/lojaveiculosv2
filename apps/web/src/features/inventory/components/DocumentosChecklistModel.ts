import type {
  InventoryChecklist,
  InventoryChecklistItem,
  InventoryChecklistStatus,
  UpsertInventoryChecklistItemInput,
} from "../model/types";

export const deliveryChecklistName = "Checklist de entrega";

export const deliveryChecklistTemplate: readonly UpsertInventoryChecklistItemInput[] =
  [
    { label: "Documentação em dia", status: "pending" },
    { label: "Chave reserva", status: "pending" },
    { label: "Manual do proprietário", status: "pending" },
    { label: "Pneus em bom estado", status: "pending" },
    { label: "Higienização interna e externa", status: "pending" },
    { label: "Revisão mecânica", status: "pending" },
    { label: "Funilaria e pintura", status: "pending" },
  ];

export function findDeliveryChecklist(
  checklists: readonly InventoryChecklist[],
  unitId: string,
) {
  return checklists.find(
    (checklist) =>
      checklist.unitId === unitId &&
      checklist.name.toLocaleLowerCase("pt-BR") ===
        deliveryChecklistName.toLocaleLowerCase("pt-BR"),
  );
}

export function checklistInputItems(
  items: readonly InventoryChecklistItem[],
): UpsertInventoryChecklistItemInput[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    notes: item.notes,
    status: item.status,
  }));
}

export function checklistStatus(
  items: readonly UpsertInventoryChecklistItemInput[],
): InventoryChecklistStatus {
  if (items.length === 0) return "pending";
  if (items.some((item) => item.status === "failed")) return "failed";
  if (
    items.every((item) =>
      ["passed", "waived"].includes(item.status ?? "pending"),
    )
  ) {
    return "passed";
  }
  if (items.some((item) => (item.status ?? "pending") !== "pending")) {
    return "in_progress";
  }
  return "pending";
}
