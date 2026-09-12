import type { InventoryCostKind } from "../model/types";

export const costKindOptions = [
  "acquisition",
  "preparation",
  "repair",
  "fee",
  "tax",
  "transport",
  "other",
] as const satisfies readonly InventoryCostKind[];

export const costFilterKinds = ["Todos", ...costKindOptions] as const;

export type CostFilterKind = (typeof costFilterKinds)[number];

export interface CostItem {
  id: string;
  account: string;
  date: string;
  dateIso: string;
  kind: InventoryCostKind;
  kindLabel: string;
  status: "active" | "voided";
  value: number;
  voidedAt?: string | null;
  voidReason?: string | null;
  receipt?: {
    id: string;
    fileName: string;
  } | null;
}

export interface FinanceiroCustosSectionProps {
  addStatus?: string | null;
  clearStatus?: () => void;
  costs: readonly CostItem[];
  formatBRL: (cents: number) => string;
  isAdding?: boolean;
  isUpdating?: boolean;
  isVoiding?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canVoid?: boolean;
  onAddCost: (
    account: string,
    value: number,
    kind: InventoryCostKind,
    costDate: string,
    file?: File | null,
  ) => Promise<boolean>;
  onDownloadReceipt?: (documentId: string) => void;
  onUpdateCost?: (
    costId: string,
    account: string,
    value: number,
    kind: InventoryCostKind,
    costDate: string,
  ) => Promise<boolean>;
  onVoidCost?: (costId: string, reason: string) => Promise<boolean>;
}

const costKindLabels: Record<InventoryCostKind, string> = {
  acquisition: "Aquisição",
  fee: "Taxa",
  other: "Outro",
  preparation: "Preparação",
  repair: "Reparo",
  tax: "Imposto",
  transport: "Transporte",
};

export function costKindLabel(kind: InventoryCostKind) {
  return costKindLabels[kind];
}
