import type { DocumentKind, DocumentLinkTarget, DocumentStatus } from "./types";

export function kindLabel(kind: DocumentKind) {
  return kindOptions.find((option) => option.value === kind)?.label ?? kind;
}

export function statusLabel(status: DocumentStatus) {
  return (
    statusOptions.find((option) => option.value === status)?.label ?? status
  );
}

export function targetLabel(target: DocumentLinkTarget) {
  return (
    targetOptions.find((option) => option.value === target)?.label ?? target
  );
}

export const kindOptions: Array<{ label: string; value: DocumentKind | "" }> = [
  { label: "Todos os tipos", value: "" },
  { label: "Cadastro comprador", value: "buyer_document" },
  { label: "Contrato", value: "sale_contract" },
  { label: "Documento da unidade", value: "vehicle_registration" },
  { label: "Financeiro", value: "finance_receipt" },
  { label: "Interno", value: "internal" },
  { label: "Nota fiscal", value: "invoice" },
  { label: "Outro", value: "other" },
  { label: "Procuração", value: "power_of_attorney" },
  { label: "Recibo", value: "sale_receipt" },
  { label: "Reserva", value: "reservation_receipt" },
  { label: "Termo de entrega", value: "delivery_term" },
  { label: "Test drive", value: "test_drive" },
  { label: "Vistoria", value: "inspection" },
];

export const statusOptions: Array<{
  label: string;
  value: DocumentStatus | "";
}> = [
  { label: "Todos os status", value: "" },
  { label: "Rascunho", value: "draft" },
  { label: "Aguardando assinatura", value: "pending_signature" },
  { label: "Assinado", value: "signed" },
  { label: "Emitido", value: "issued" },
  { label: "Arquivado", value: "archived" },
  { label: "Cancelado", value: "voided" },
];

export const targetOptions: Array<{
  label: string;
  value: DocumentLinkTarget | "";
}> = [
  { label: "Todos os contextos", value: "" },
  { label: "Loja", value: "store" },
  { label: "Unidade", value: "vehicle_unit" },
  { label: "Lead", value: "lead" },
  { label: "Venda", value: "sale" },
  { label: "Pagamento", value: "sale_payment" },
  { label: "Financeiro", value: "finance_entry" },
  { label: "Financiamento", value: "financing_inquiry" },
  { label: "Fiscal", value: "fiscal_document" },
];
