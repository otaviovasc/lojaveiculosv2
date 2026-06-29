import {
  formatMoneyInput,
  type WorkflowMode,
  type WorkflowState,
} from "./InventoryWorkflowPanelParts";
import type { InventoryListingDetail } from "../model/types";

type BuyerForm = {
  buyerAddress: string;
  buyerDocument: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
};

export type WorkflowForm = BuyerForm & {
  paidAmount: string;
  paymentMethod: string;
  reason: string;
  salePrice: string;
  signalAmount: string;
  unitId: string;
};

export const paymentMethods = [
  ["pix", "Pix"],
  ["bank_transfer", "Transferencia"],
  ["cash", "Dinheiro"],
  ["card", "Cartao"],
  ["financing", "Financiamento"],
] as const;

export function createWorkflowForm(
  detail: InventoryListingDetail,
  initialUnitId?: string | null,
): WorkflowForm {
  const unitId = detail.units.some((unit) => unit.id === initialUnitId)
    ? (initialUnitId ?? "")
    : (detail.units[0]?.id ?? "");

  return {
    buyerAddress: "",
    buyerDocument: "",
    buyerEmail: "",
    buyerName: "",
    buyerPhone: "",
    paidAmount: "",
    paymentMethod: "pix",
    reason: "",
    salePrice: formatMoneyInput(detail.listing.priceCents),
    signalAmount: "",
    unitId,
  };
}

export function buildWorkflowInput(form: WorkflowForm, salePriceCents: number) {
  return {
    buyer: {
      address: nullableText(form.buyerAddress),
      document: nullableText(form.buyerDocument),
      email: nullableText(form.buyerEmail),
      name: form.buyerName.trim(),
      phone: nullableText(form.buyerPhone),
    },
    paymentMethod: form.paymentMethod,
    reason: nullableText(form.reason),
    salePriceCents,
    unitId: form.unitId,
  };
}

export function validateWorkflowForm(
  form: WorkflowForm,
  mode: WorkflowMode,
  salePriceCents: number | null,
  signalAmountCents: number | null,
  paidAmountCents: number | null | undefined,
): WorkflowState | null {
  if (!form.unitId) {
    return { kind: "error", message: "Selecione a unidade." };
  }
  if (!form.buyerName.trim()) {
    return { kind: "error", message: "Informe o cliente comprador." };
  }
  if (salePriceCents === null) {
    return { kind: "error", message: "Informe o valor de venda." };
  }
  if (mode === "reserve" && signalAmountCents === null) {
    return { kind: "error", message: "Informe o sinal da reserva." };
  }
  if (mode === "sell" && paidAmountCents === null && form.paidAmount.trim()) {
    return { kind: "error", message: "Informe o valor pago." };
  }

  return null;
}

export function savedModeMessage(mode: WorkflowMode) {
  return { kind: "saved" as const, mode };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
