import {
  interpolateSampleVariables,
  sampleValue as getSampleValue,
} from "@lojaveiculosv2/documents";
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
  financeSectionTitle: string;
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

export function renderDocumentTemplatePreview(
  draft: DocumentTemplateDraft,
  kind: DocumentKind,
  context = "sale",
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

  if (isOperationalPreviewContext(context)) {
    return {
      clauses: draft.clauses.map(renderClause),
      documentNumber: documentNumber(kind),
      finance: [
        { label: "Origem", value: "Sistema" },
        { label: "Status", value: "Gerado sob demanda" },
        { label: "Revisão", value: "Modelo travado" },
      ],
      financeSectionTitle: context === "fiscal" ? "Controle fiscal" : "Resumo",
      intro: introForOperationalContext(context),
      issuedAt: "24/06/2026 13:40",
      sections: [
        {
          fields: [
            { label: "Loja", value: "Loja Exemplo Veículos" },
            { label: "Emissão", value: "24/06/2026 13:40" },
            { label: "Modelo", value: renderedTitle },
            { label: "Contexto", value: contextLabel(context) },
          ],
          title: "Escopo do modelo",
        },
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

  return {
    clauses: draft.clauses.map((clause) =>
      applyTemplateSampleValues(clause.trim() || "Cláusula em branco."),
    ),
    documentNumber: documentNumber(kind),
    finance: financeFields,
    financeSectionTitle: "Condições comerciais",
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
  return getSampleValue(variable);
}

function field(label: string, variable: string): DocumentTemplatePreviewField {
  return { label, value: getSampleValue(variable) };
}

function applyTemplateSampleValues(value: string) {
  return interpolateSampleVariables(value);
}

function renderClause(clause: string) {
  return applyTemplateSampleValues(
    clause.trim() || "Seção gerada pelo sistema.",
  );
}

function isOperationalPreviewContext(context: string) {
  return context === "finance" || context === "fiscal" || context === "report";
}

function contextLabel(context: string) {
  if (context === "finance") return "Financeiro";
  if (context === "fiscal") return "Fiscal";
  if (context === "report") return "Relatório";
  return "Operacional";
}

function introForOperationalContext(context: string) {
  if (context === "fiscal") {
    return "Prévia estrutural do documento fiscal com campos de controle, emissão e conferência usados pelo renderizador compartilhado.";
  }
  if (context === "finance") {
    return "Prévia estrutural do documento financeiro com totais, origem e revisão preservados para emissão operacional.";
  }
  return "Prévia estrutural do relatório gerado pelo sistema com cabeçalho, conteúdo e rodapé compartilhados.";
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
