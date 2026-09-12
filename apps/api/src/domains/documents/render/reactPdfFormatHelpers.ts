/* Format helpers shared by all V1-style document renderers. */
/* ---------- format helpers ---------- */

const pdfTimeZone = "America/Sao_Paulo";

export function formatPdfDate(value: unknown): string {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("pt-BR", { timeZone: pdfTimeZone })
    : "";
}

export function formatPdfDateTime(value: unknown): string {
  const date = toDate(value);
  return date
    ? date.toLocaleString("pt-BR", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        timeZone: pdfTimeZone,
        year: "numeric",
      })
    : "";
}

export function formatCurrencyCents(value: number | null | undefined): string {
  const cents = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

export function buyerDocumentLabel(document: string | undefined): string {
  return digits(document).length > 11 ? "CNPJ" : "CPF";
}

export function formatBuyerDocument(document: string | undefined): string {
  const value = digits(document);
  if (value.length === 11) {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
  }
  if (value.length === 14) return formatCnpj(value);
  return document?.trim() || "";
}

export function formatCnpj(value: string | undefined): string {
  const d = digits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatPhoneForPdf(value: string | undefined): string {
  const raw = value?.trim() ?? "";
  const d = digits(raw);
  const hasCountryCode = d.startsWith("55") && d.length >= 12;
  const local = hasCountryCode ? d.slice(2) : d;
  if (local.length !== 10 && local.length !== 11) return raw;
  const prefix = hasCountryCode ? "+55 " : "";
  const subscriber =
    local.length === 11
      ? `${local.slice(2, 7)}-${local.slice(7)}`
      : `${local.slice(2, 6)}-${local.slice(6)}`;
  return `${prefix}(${local.slice(0, 2)}) ${subscriber}`;
}

export function paymentMethodLabel(method: string | undefined): string {
  const labels: Record<string, string> = {
    boleto: "Boleto",
    cash: "Dinheiro",
    credit_card: "Cartão de Crédito",
    financing: "Financiamento",
    letter_of_credit: "Carta de Crédito",
    pix: "Pix",
    trade_in: "Troca",
    transfer: "Transferência",
  };
  const key = (method ?? "").trim().toLowerCase();
  if (labels[key]) return labels[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
