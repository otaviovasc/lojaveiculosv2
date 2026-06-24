import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import {
  createWorkflowTemplateVariables,
  interpolateWorkflowTemplateClause,
} from "./vehicleWorkflowTemplateVariables.js";

export type WorkflowPdfField = {
  label: string;
  value: string;
};

export type WorkflowPdfSection = {
  fields: readonly WorkflowPdfField[];
  title: string;
};

export type WorkflowPdfContent = {
  audit: WorkflowPdfSection;
  clauses: readonly string[];
  finance: WorkflowPdfSection;
  intro: string;
  subtitle: string;
  title: string;
  vehicle: WorkflowPdfSection;
  buyer: WorkflowPdfSection;
};

export function buildWorkflowPdfContent(
  record: CreateVehicleDocumentRecord,
): WorkflowPdfContent {
  const metadata = asRecord(record.metadata);
  const buyer = asRecord(metadata.buyer);
  const finance = asRecord(metadata.finance);
  const vehicle = asRecord(metadata.vehicle);
  const variables = createWorkflowTemplateVariables({
    buyer,
    finance,
    vehicle,
  });

  return {
    audit: {
      fields: [
        { label: "Venda", value: text(metadata.saleId) },
        { label: "Pagamento", value: text(metadata.salePaymentId) },
        {
          label: "Modelo",
          value: text(metadata.templateTitle ?? metadata.template),
        },
        { label: "Vinculo", value: text(record.targetId) },
      ],
      title: "Auditoria",
    },
    buyer: {
      fields: [
        { label: "Comprador", value: text(buyer.name) },
        { label: "Documento", value: text(buyer.document) },
        { label: "Telefone", value: text(buyer.phone) },
        { label: "Email", value: text(buyer.email) },
        { label: "Endereco", value: text(buyer.address) },
      ],
      title: "Dados do comprador",
    },
    clauses: declarationLines(record.kind, metadata, variables),
    finance: {
      fields: [
        { label: "Forma", value: text(finance.paymentMethod) },
        { label: "Sinal", value: money(finance.signalAmountCents) },
        { label: "Valor pago", value: money(finance.paidAmountCents) },
        {
          label: "Valor total",
          value: money(finance.totalAmountCents ?? finance.salePriceCents),
        },
      ],
      title: "Condicoes comerciais",
    },
    intro: introForKind(record.kind),
    subtitle: `${labelForKind(record.kind)} | Gerado em ${new Date().toLocaleString(
      "pt-BR",
      { dateStyle: "short", timeStyle: "short" },
    )}`,
    title:
      text(metadata.templateTitle) === "-"
        ? record.title
        : text(metadata.templateTitle),
    vehicle: {
      fields: [
        { label: "Veiculo", value: text(vehicle.title) },
        { label: "Placa", value: text(vehicle.plate) },
        {
          label: "Ano",
          value: `${text(vehicle.manufactureYear)} / ${text(vehicle.modelYear)}`,
        },
        { label: "Chassi/VIN", value: text(vehicle.vin) },
        { label: "Unidade", value: text(vehicle.unitId) },
      ],
      title: "Dados do veiculo",
    },
  };
}

function declarationLines(
  kind: string,
  metadata: Record<string, unknown>,
  variables: Record<string, string>,
): readonly string[] {
  const templateClauses = stringArray(metadata.templateClauses);
  if (templateClauses.length) {
    return templateClauses.map((clause) =>
      interpolateWorkflowTemplateClause(clause, variables),
    );
  }
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

function introForKind(kind: string) {
  if (kind === "reservation_receipt") {
    return "Recebemos do comprador qualificado abaixo o valor indicado como sinal para reserva do veiculo descrito.";
  }
  if (kind === "delivery_term") {
    return "Pelo presente termo, a loja declara a entrega do veiculo ao comprador, com responsabilidades assumidas a partir desta data.";
  }
  if (kind === "power_of_attorney") {
    return "Instrumento preparado com os dados da venda para apoiar atos de transferencia e regularizacao do veiculo.";
  }
  if (kind === "sale_receipt") {
    return "A loja registra o recebimento dos valores da venda do veiculo qualificado abaixo.";
  }
  return "Pelo presente instrumento particular, as partes qualificadas ajustam a compra e venda do veiculo descrito.";
}

function labelForKind(kind: string) {
  const labels: Record<string, string> = {
    delivery_term: "Termo de entrega",
    power_of_attorney: "Procuracao",
    reservation_receipt: "Recibo de sinal",
    sale_contract: "Contrato de compra e venda",
    sale_receipt: "Recibo de venda",
  };
  return labels[kind] ?? kind;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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
