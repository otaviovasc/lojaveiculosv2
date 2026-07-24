import type {
  DocumentKind,
  DocumentStatus,
  LinkedDocument,
} from "../ports/documentRepository.js";

export type DocumentPreviewSection = {
  heading: string;
  lines: readonly string[];
};

export type DocumentPreview = {
  document: LinkedDocument;
  generatedAt: Date;
  sections: readonly DocumentPreviewSection[];
};

export function buildDocumentPreview(
  document: LinkedDocument,
): DocumentPreview {
  const metadata = document.metadata;
  const buyer = asRecord(metadata.buyer);
  const finance = asRecord(metadata.finance);
  const vehicle = asRecord(metadata.vehicle);
  const clauses = stringArray(metadata.templateClauses);

  return {
    document,
    generatedAt: new Date(),
    sections: [
      { heading: "Documento", lines: documentLines(document, metadata) },
      { heading: "Comprador", lines: partyLines(buyer) },
      { heading: "Veículo", lines: vehicleLines(vehicle) },
      { heading: "Valores", lines: financeLines(finance) },
      { heading: "Cláusulas", lines: clauses.length ? clauses : ["-"] },
    ],
  };
}

function documentLines(
  document: LinkedDocument,
  metadata: Record<string, unknown>,
) {
  return [
    `Título: ${document.title}`,
    `Tipo: ${kindLabel(document.kind)}`,
    `Status: ${statusLabel(document.status)}`,
    `Modelo: ${text(metadata.templateTitle ?? metadata.template)}`,
  ];
}

function partyLines(party: Record<string, unknown>) {
  return [
    `Nome: ${text(party.name)}`,
    `Documento: ${text(party.document)}`,
    `Telefone: ${text(party.phone)}`,
    `Email: ${text(party.email)}`,
  ];
}

function vehicleLines(vehicle: Record<string, unknown>) {
  return [
    `Título: ${text(vehicle.title)}`,
    `Placa: ${text(vehicle.plate)}`,
    `Chassi/VIN: ${text(vehicle.vin)}`,
  ];
}

function financeLines(finance: Record<string, unknown>) {
  return [
    `Forma de pagamento: ${text(finance.paymentMethod)}`,
    `Valor do sinal: ${money(finance.signalAmountCents)}`,
    `Valor pago: ${money(finance.paidAmountCents)}`,
    `Valor total: ${money(finance.totalAmountCents ?? finance.salePriceCents)}`,
  ];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function money(value: unknown) {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function kindLabel(kind: DocumentKind) {
  return (
    {
      buyer_acknowledgment: "Termo de recebimento",
      buyer_document: "Cadastro comprador",
      consignment_contract: "Contrato de consignação",
      delivery_term: "Termo de entrega",
      finance_receipt: "Financeiro",
      inspection: "Vistoria",
      internal: "Interno",
      invoice: "Nota fiscal",
      other: "Outro",
      power_of_attorney: "Procuração",
      reservation_receipt: "Reserva",
      sale_contract: "Contrato",
      sale_receipt: "Recibo",
      test_drive: "Test drive",
      vehicle_registration: "Documento da unidade",
      warranty_certificate: "Certificado de garantia",
    } satisfies Record<DocumentKind, string>
  )[kind];
}

function statusLabel(status: DocumentStatus) {
  return (
    {
      archived: "Arquivado",
      draft: "Rascunho",
      issued: "Emitido",
      pending_signature: "Aguardando assinatura",
      signed: "Assinado",
      voided: "Cancelado",
    } satisfies Record<DocumentStatus, string>
  )[status];
}
