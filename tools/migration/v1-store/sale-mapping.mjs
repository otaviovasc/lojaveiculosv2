import { mapDocumentKind } from "./common.mjs";

export function documentKindsForSale(documents, saleId) {
  const supported = new Set([
    "delivery_term",
    "power_of_attorney",
    "sale_contract",
    "sale_receipt",
  ]);
  return [
    ...new Set(
      documents
        .filter((document) => document.saleId === saleId)
        .map((document) => mapDocumentKind(document.type))
        .filter((kind) => supported.has(kind)),
    ),
  ];
}

export function mapEntryType(type) {
  if (type === "EXPENSE") return "expense";
  if (type === "PROFIT") return "revenue";
  throw new Error(`Unmapped finance entry type: ${type}`);
}

export function mapSalePaymentMethod(method) {
  const normalized = String(method ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const mapped = {
    boleto: "boleto",
    carta_credito: "letter_of_credit",
    carta_de_credito: "letter_of_credit",
    cartao_credito: "credit_card",
    cartao_de_credito: "credit_card",
    cash: "cash",
    credit_card: "credit_card",
    dinheiro: "cash",
    financiamento: "financing",
    financing: "financing",
    letter_of_credit: "letter_of_credit",
    pix: "pix",
    trade_in: "trade_in",
    transfer: "transfer",
    transferencia: "transfer",
    transferencia_bancaria: "transfer",
    troca: "trade_in",
  }[normalized];
  if (!mapped) {
    throw new Error(`Unmapped sale payment method: ${method}`);
  }
  return mapped;
}
