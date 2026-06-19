import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";

type LineGroup = {
  heading: string;
  lines: readonly string[];
};

export async function renderWorkflowDocumentPdf(
  record: CreateVehicleDocumentRecord,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const groups = buildDocumentGroups(record);
  let y = 790;

  page.drawText(record.title, {
    color: rgb(0.05, 0.09, 0.16),
    font: bold,
    size: 18,
    x: 48,
    y,
  });
  y -= 22;
  page.drawText(
    `Documento: ${record.kind} | Gerado em: ${new Date().toISOString()}`,
    {
      color: rgb(0.34, 0.39, 0.45),
      font: regular,
      size: 8,
      x: 48,
      y,
    },
  );
  y -= 28;

  for (const group of groups) {
    y = drawGroup({ bold, group, page, regular, y });
    y -= 10;
  }

  drawSignatureBlock({ bold, page, regular });
  return pdf.save();
}

function buildDocumentGroups(
  record: CreateVehicleDocumentRecord,
): readonly LineGroup[] {
  const metadata = asRecord(record.metadata);
  const buyer = asRecord(metadata.buyer);
  const finance = asRecord(metadata.finance);
  const vehicle = asRecord(metadata.vehicle);

  return [
    { heading: "Partes", lines: buyerLines(buyer) },
    { heading: "Veiculo", lines: vehicleLines(vehicle) },
    { heading: "Valores", lines: financeLines(finance) },
    { heading: "Declaracao", lines: declarationLines(record.kind) },
    { heading: "Auditoria", lines: auditLines(record, metadata) },
  ];
}

function buyerLines(buyer: Record<string, unknown>): readonly string[] {
  return [
    `Comprador: ${text(buyer.name)}`,
    `Documento: ${text(buyer.document)}`,
    `Telefone: ${text(buyer.phone)}`,
    `Email: ${text(buyer.email)}`,
    `Endereco: ${text(buyer.address)}`,
  ];
}

function vehicleLines(vehicle: Record<string, unknown>): readonly string[] {
  return [
    `Titulo: ${text(vehicle.title)}`,
    `Placa: ${text(vehicle.plate)}`,
    `Chassi/VIN: ${text(vehicle.vin)}`,
    `Ano: ${text(vehicle.manufactureYear)} / ${text(vehicle.modelYear)}`,
    `Unidade: ${text(vehicle.unitId)}`,
  ];
}

function financeLines(finance: Record<string, unknown>): readonly string[] {
  return [
    `Forma de pagamento: ${text(finance.paymentMethod)}`,
    `Valor do sinal: ${money(finance.signalAmountCents)}`,
    `Valor pago: ${money(finance.paidAmountCents)}`,
    `Valor total: ${money(finance.totalAmountCents ?? finance.salePriceCents)}`,
  ];
}

function declarationLines(kind: string): readonly string[] {
  if (kind === "reservation_receipt") {
    return [
      "A loja declara o recebimento do sinal informado para reserva do veiculo descrito.",
      "A reserva deve manter trilha de auditoria do comprador, valor, metodo e operador.",
    ];
  }
  if (kind === "delivery_term") {
    return [
      "As partes registram a entrega do veiculo e ciencia das condicoes cadastradas.",
    ];
  }
  if (kind === "power_of_attorney") {
    return [
      "Documento-base para poderes de transferencia conforme dados da venda.",
    ];
  }
  if (kind === "sale_receipt") {
    return [
      "A loja registra o recebimento do valor informado para a venda do veiculo.",
    ];
  }
  return [
    "Contrato-base de compra e venda gerado a partir da venda registrada no sistema.",
  ];
}

function auditLines(
  record: CreateVehicleDocumentRecord,
  metadata: Record<string, unknown>,
): readonly string[] {
  return [
    `Sale ID: ${text(metadata.saleId)}`,
    `Payment ID: ${text(metadata.salePaymentId)}`,
    `Template: ${text(metadata.template)}`,
    `Listing ID: ${record.targetId}`,
  ];
}

function drawGroup(input: {
  bold: PDFFontLike;
  group: LineGroup;
  page: PDFPageLike;
  regular: PDFFontLike;
  y: number;
}): number {
  let y = input.y;
  input.page.drawText(input.group.heading, {
    color: rgb(0.02, 0.48, 0.28),
    font: input.bold,
    size: 11,
    x: 48,
    y,
  });
  y -= 16;
  for (const line of input.group.lines) {
    input.page.drawText(line.slice(0, 110), {
      font: input.regular,
      size: 9,
      x: 60,
      y,
    });
    y -= 13;
  }
  return y;
}

function drawSignatureBlock(input: {
  bold: PDFFontLike;
  page: PDFPageLike;
  regular: PDFFontLike;
}) {
  const labels = ["Loja / vendedor", "Comprador"];
  for (const [index, label] of labels.entries()) {
    const x = index === 0 ? 72 : 330;
    input.page.drawLine({ end: { x: x + 190, y: 126 }, start: { x, y: 126 } });
    input.page.drawText(label, { font: input.bold, size: 9, x, y: 110 });
    input.page.drawText("Assinatura", {
      font: input.regular,
      size: 8,
      x,
      y: 98,
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function money(value: unknown): string {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

type PDFFontLike = Awaited<ReturnType<PDFDocument["embedFont"]>>;
type PDFPageLike = ReturnType<PDFDocument["addPage"]>;
