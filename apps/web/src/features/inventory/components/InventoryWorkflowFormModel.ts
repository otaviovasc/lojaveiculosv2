import {
  formatMoneyInput,
  type WorkflowMode,
  type WorkflowState,
} from "./InventoryWorkflowPanelParts";
import {
  salePaymentMethods,
  type SalePaymentMethod,
} from "@lojaveiculosv2/shared";
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
  paymentMethod: SalePaymentMethod;
  reason: string;
  salePrice: string;
  signalAmount: string;
  unitId: string;
};

const paymentMethodLabels: Record<SalePaymentMethod, string> = {
  boleto: "Boleto bancário",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  financing: "Financiamento",
  letter_of_credit: "Carta de crédito",
  pix: "Pix",
  trade_in: "Veículo na troca",
  transfer: "Transferência",
};

export const paymentMethods: readonly (readonly [SalePaymentMethod, string])[] =
  salePaymentMethods.map((method) => [method, paymentMethodLabels[method]]);

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
