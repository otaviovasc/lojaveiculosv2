import { maskCurrency, unmaskCurrency } from "../../../lib/masks";
import type { InventoryListingDetail } from "../model/types";
import {
  storeDataFromSettings,
  type InventoryStoreSettings,
} from "./InventoryPrintTypes";

export const contractTemplates = [
  {
    id: "sale_contract",
    name: "Contrato de compra e venda",
    scope: "Venda",
  },
  {
    id: "reservation_receipt",
    name: "Recibo de sinal e reserva",
    scope: "Reserva",
  },
  {
    id: "sale_receipt",
    name: "Recibo de venda",
    scope: "Venda",
  },
] as const;

export type ContractTemplateId = (typeof contractTemplates)[number]["id"];

export const contractTemplateOptions = contractTemplates.map((template) => ({
  label: template.name,
  value: template.id,
}));

export const contractPaymentOptions = [
  { label: "Pix", value: "pix" },
  { label: "Transferencia", value: "bank_transfer" },
  { label: "Dinheiro", value: "cash" },
  { label: "Cartao", value: "card" },
  { label: "Financiamento", value: "financing" },
] as const;

export type ContractForm = {
  buyerAddress: string;
  buyerDocument: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  contractDate: string;
  notes: string;
  paymentMethod: string;
  reservationExpiresAt: string;
  salePrice: string;
  signalAmount: string;
  storeAddress: string;
  storeCity: string;
  storeDocument: string;
  storeName: string;
  storePhone: string;
  storeState: string;
  templateId: ContractTemplateId;
  unitId: string;
};

export type ContractDraft = {
  date: string;
  id: string;
  status: "Minuta";
  title: string;
};

export function createContractForm(
  detail: InventoryListingDetail,
  storeSettings: InventoryStoreSettings = null,
): ContractForm {
  const store = storeDataFromSettings(storeSettings);

  return {
    buyerAddress: "",
    buyerDocument: "",
    buyerEmail: "",
    buyerName: "",
    buyerPhone: "",
    contractDate: formatDate(new Date()),
    notes: "",
    paymentMethod: "pix",
    reservationExpiresAt: formatDate(addDays(new Date(), 5)),
    salePrice: formatContractMoney(detail.listing.priceCents),
    signalAmount: "",
    storeAddress: store.endereco ?? "",
    storeCity: store.cidade ?? "",
    storeDocument: store.cnpj ?? "",
    storeName: store.nome ?? "",
    storePhone: store.telefone ?? "",
    storeState: store.estado ?? "",
    templateId: "sale_contract",
    unitId: detail.units[0]?.id ?? "",
  };
}

export function mergeContractFormStoreSettings(
  form: ContractForm,
  storeSettings: InventoryStoreSettings,
): ContractForm {
  const store = storeDataFromSettings(storeSettings);

  return {
    ...form,
    storeAddress: form.storeAddress || store.endereco || "",
    storeCity: form.storeCity || store.cidade || "",
    storeDocument: form.storeDocument || store.cnpj || "",
    storeName: form.storeName || store.nome || "",
    storePhone: form.storePhone || store.telefone || "",
    storeState: form.storeState || store.estado || "",
  };
}

export function validateContractForm(form: ContractForm): readonly string[] {
  const missing: string[] = [];

  requireText(missing, form.unitId, "Unidade do estoque");
  requireText(missing, form.contractDate, "Data do documento");
  requireText(missing, form.buyerName, "Nome do comprador");
  requireText(missing, form.buyerDocument, "CPF/CNPJ do comprador");
  requireText(missing, form.storeName, "Nome da loja");
  requireText(missing, form.storeDocument, "CNPJ da loja");
  requireText(missing, form.storeAddress, "Endereco da loja");
  requireText(missing, form.storeCity, "Cidade da loja");

  if (form.templateId === "reservation_receipt") {
    requireMoney(missing, form.signalAmount, "Valor do sinal");
    requireText(missing, form.reservationExpiresAt, "Validade da reserva");
  } else {
    requireText(missing, form.buyerAddress, "Endereco do comprador");
    requireMoney(missing, form.salePrice, "Valor de venda");
    requireText(missing, form.paymentMethod, "Forma de pagamento");
  }

  return missing;
}

export function createContractDraft(form: ContractForm): ContractDraft {
  const template = contractTemplates.find(
    (item) => item.id === form.templateId,
  );

  return {
    date: form.contractDate,
    id: `contract-${form.templateId}-${Date.now()}`,
    status: "Minuta",
    title: `${template?.name ?? "Contrato"} - ${form.buyerName.trim()}`,
  };
}

export function isReservationTemplate(templateId: ContractTemplateId) {
  return templateId === "reservation_receipt";
}

function formatContractMoney(value: number | null) {
  return value === null ? "" : maskCurrency(String(value));
}

function requireText(missing: string[], value: string, label: string) {
  if (!value.trim()) missing.push(label);
}

function requireMoney(missing: string[], value: string, label: string) {
  if (unmaskCurrency(value) <= 0) missing.push(label);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}
