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
  const store = asRecord(metadata.store);
  const vehicle = asRecord(metadata.vehicle);
  const variables = createWorkflowTemplateVariables({
    buyer,
    finance,
    store,
    vehicle,
  });

  return {
    audit: {
      fields: [
        {
          label: "Documento",
          value: labelForKind(record.kind),
        },
        { label: "Versão", value: "1" },
        { label: "Origem", value: "Fluxo operacional auditado" },
        { label: "Integridade", value: "Registro preservado na plataforma" },
      ],
      title: "Controle do documento",
    },
    buyer: {
      fields: [
        { label: "Comprador", value: text(buyer.name) },
        { label: "Documento", value: text(buyer.document) },
        { label: "Telefone", value: formatPhone(buyer.phone) },
        { label: "Email", value: text(buyer.email) },
        { label: "Endereço", value: text(buyer.address) },
      ],
      title: "Dados do comprador",
    },
    clauses: declarationLines(record.kind, metadata, variables),
    finance: {
      fields: financeFieldsForKind(record.kind, finance),
      title: "Condições comerciais",
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
        { label: "Veículo", value: text(vehicle.title) },
        { label: "Placa", value: text(vehicle.plate) },
        {
          label: "Ano",
          value: `${text(vehicle.manufactureYear)} / ${text(vehicle.modelYear)}`,
        },
        { label: "Chassi/VIN", value: text(vehicle.vin) },
      ],
      title: "Dados do veículo",
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
    return "Recebemos do comprador qualificado abaixo o valor indicado como sinal para reserva do veículo descrito.";
  }
  if (kind === "delivery_term") {
    return "Pelo presente termo, a loja declara a entrega do veículo ao comprador, com responsabilidades assumidas a partir desta data.";
  }
  if (kind === "power_of_attorney") {
    return "Instrumento preparado com os dados da venda para apoiar atos de transferência e regularização do veículo.";
  }
  if (kind === "sale_receipt") {
    return "A loja registra o recebimento dos valores da venda do veículo qualificado abaixo.";
  }
  return "Pelo presente instrumento particular, as partes qualificadas ajustam a compra e venda do veículo descrito.";
}

function labelForKind(kind: string) {
  const labels: Record<string, string> = {
    delivery_term: "Termo de entrega",
    power_of_attorney: "Procuração",
    reservation_receipt: "Recibo de sinal",
    sale_contract: "Contrato de compra e venda",
    sale_receipt: "Recibo de venda",
  };
  return labels[kind] ?? kind;
}

function financeFieldsForKind(
  kind: string,
  finance: Record<string, unknown>,
): readonly WorkflowPdfField[] {
  const paymentMethod = {
    label: "Forma de pagamento",
    value: text(finance.paymentMethod),
  };
  if (kind === "reservation_receipt") {
    return [
      paymentMethod,
      {
        label: "Valor do recibo",
        value: money(finance.signalAmountCents),
      },
      {
        label: "Valor do veículo",
        value: money(finance.totalAmountCents ?? finance.salePriceCents),
      },
    ];
  }
  if (kind === "sale_receipt") {
    return [
      paymentMethod,
      {
        label: "Valor do recibo",
        value: money(finance.paidAmountCents ?? finance.salePriceCents),
      },
      { label: "Valor da venda", value: money(finance.salePriceCents) },
    ];
  }
  return [
    paymentMethod,
    { label: "Sinal", value: money(finance.signalAmountCents) },
    { label: "Valor pago", value: money(finance.paidAmountCents) },
    {
      label: "Valor total",
      value: money(finance.totalAmountCents ?? finance.salePriceCents),
    },
  ];
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

function formatPhone(value: unknown) {
  const raw = text(value);
  const digits = raw.replace(/\D/g, "");
  const hasCountryCode = digits.startsWith("55") && digits.length >= 12;
  const local = hasCountryCode ? digits.slice(2) : digits;
  if (local.length !== 10 && local.length !== 11) return raw;
  const prefix = hasCountryCode ? "+55 " : "";
  const subscriber =
    local.length === 11
      ? `${local.slice(2, 7)}-${local.slice(7)}`
      : `${local.slice(2, 6)}-${local.slice(6)}`;
  return `${prefix}(${local.slice(0, 2)}) ${subscriber}`;
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}
