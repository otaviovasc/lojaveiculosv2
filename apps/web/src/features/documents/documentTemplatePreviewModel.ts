import type { DocumentKind } from "./types";

export type DocumentTemplateDraft = {
  clauses: readonly string[];
  title: string;
};

export type DocumentTemplatePreviewField = {
  label: string;
  value: string;
};

export type DocumentTemplatePreviewSection = {
  fields: readonly DocumentTemplatePreviewField[];
  title: string;
};

export type DocumentTemplatePreviewModel = {
  clauses: readonly string[];
  documentNumber: string;
  finance: readonly DocumentTemplatePreviewField[];
  intro: string;
  issuedAt: string;
  sections: readonly DocumentTemplatePreviewSection[];
  store: {
    address: string;
    cnpj: string;
    name: string;
    phone: string;
  };
  title: string;
};

const sampleValues: Record<string, string> = {
  "{{buyer.document}}": "123.456.789-00",
  "{{buyer.name}}": "Ana Cliente",
  "{{finance.paymentMethod}}": "PIX",
  "{{finance.salePrice}}": "R$ 126.900,00",
  "{{finance.signalAmount}}": "R$ 5.000,00",
  "{{vehicle.plate}}": "ABC1D23",
  "{{vehicle.title}}": "Fiat Toro Volcano 2023",
};

export function renderDocumentTemplatePreview(
  draft: DocumentTemplateDraft,
  kind: DocumentKind,
): DocumentTemplatePreviewModel {
  const renderedTitle = applyTemplateSampleValues(
    draft.title.trim() || kindFallbackTitle(kind),
  );
  const vehicleFields = [
    field("Veículo", "{{vehicle.title}}"),
    field("Placa", "{{vehicle.plate}}"),
    { label: "Ano", value: "2022 / 2023" },
    { label: "Chassi/VIN", value: "9BD00000000000000" },
  ];
  const buyerFields = [
    field("Comprador", "{{buyer.name}}"),
    field("Documento", "{{buyer.document}}"),
    { label: "Telefone", value: "(11) 99999-9999" },
    { label: "E-mail", value: "ana.cliente@example.com" },
  ];
  const financeFields = [
    field("Valor da venda", "{{finance.salePrice}}"),
    field("Sinal", "{{finance.signalAmount}}"),
    field("Forma", "{{finance.paymentMethod}}"),
    { label: "Vendedor", value: "Carlos Vendedor" },
  ];

  return {
    clauses: draft.clauses.map((clause) =>
      applyTemplateSampleValues(clause.trim() || "Cláusula em branco."),
    ),
    documentNumber: documentNumber(kind),
    finance: financeFields,
    intro: introForKind(kind),
    issuedAt: "24/06/2026 13:40",
    sections: [
      { fields: buyerFields, title: "Dados do comprador" },
      { fields: vehicleFields, title: "Dados do veículo" },
    ],
    store: {
      address: "Rua das Flores, 123 - Centro, São Paulo - SP",
      cnpj: "00.000.000/0000-00",
      name: "Loja Exemplo Veículos",
      phone: "(11) 99999-9999",
    },
    title: renderedTitle,
  };
}

export function variableSample(variable: string) {
  return sampleValue(variable);
}

function sampleValue(variable: string) {
  return sampleValues[variable] ?? "Valor preenchido na emissão";
}

function field(label: string, variable: string): DocumentTemplatePreviewField {
  return { label, value: sampleValue(variable) };
}

function applyTemplateSampleValues(value: string) {
  return Object.entries(sampleValues).reduce(
    (current, [variable, sample]) => current.replaceAll(variable, sample),
    value,
  );
}

function kindFallbackTitle(kind: DocumentKind) {
  const titles: Partial<Record<DocumentKind, string>> = {
    delivery_term: "Termo de entrega",
    power_of_attorney: "Procuração",
    reservation_receipt: "Recibo de sinal",
    sale_contract: "Contrato de compra e venda",
    sale_receipt: "Recibo de venda",
  };
  return titles[kind] ?? "Documento";
}

function documentNumber(kind: DocumentKind) {
  if (kind === "reservation_receipt") return "Reserva nº 1024";
  if (kind === "sale_contract" || kind === "sale_receipt")
    return "Venda nº 2048";
  if (kind === "delivery_term") return "Entrega nº 2048";
  if (kind === "power_of_attorney") return "Procuração nº 2048";
  return "Documento nº 2048";
}

function introForKind(kind: DocumentKind) {
  if (kind === "reservation_receipt") {
    return "Recebemos do comprador qualificado abaixo a importância descrita como sinal para reserva do veículo, conforme dados da operação registrada.";
  }
  if (kind === "delivery_term") {
    return "Pelo presente termo, a loja declara a entrega do veículo ao comprador, que assume a responsabilidade civil e administrativa a partir desta data.";
  }
  if (kind === "power_of_attorney") {
    return "Instrumento preparado com os dados da venda para outorga dos poderes necessários à transferência e regularização do veículo.";
  }
  if (kind === "sale_receipt") {
    return "A loja registra o recebimento dos valores da venda do veículo qualificado abaixo, mantendo este recibo vinculado à operação.";
  }
  return "Pelo presente instrumento particular, as partes qualificadas ajustam a compra e venda do veículo descrito, mediante as condições comerciais informadas.";
}
