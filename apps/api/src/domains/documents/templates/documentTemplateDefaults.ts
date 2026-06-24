import type {
  DocumentKind,
  DocumentTemplate,
} from "../ports/documentRepository.js";

export const documentTemplateKinds = [
  "reservation_receipt",
  "sale_contract",
  "sale_receipt",
  "delivery_term",
  "power_of_attorney",
] satisfies DocumentKind[];

const variables = [
  "{{buyer.name}}",
  "{{buyer.document}}",
  "{{vehicle.title}}",
  "{{vehicle.plate}}",
  "{{finance.paymentMethod}}",
  "{{finance.salePrice}}",
  "{{finance.signalAmount}}",
] as const;

const defaults: Record<
  (typeof documentTemplateKinds)[number],
  {
    clauses: readonly string[];
    title: string;
  }
> = {
  delivery_term: {
    title: "Termo de entrega",
    clauses: [
      "A loja declara que entregou o veiculo {{vehicle.title}}, placa {{vehicle.plate}}, ao comprador {{buyer.name}}, que assume a posse direta nesta data.",
      "O comprador declara ter vistoriado o veiculo, recebido as informacoes essenciais da venda e conferido os documentos disponiveis.",
      "A partir da entrega, multas, tributos, guarda, uso e demais responsabilidades de circulacao seguem as condicoes registradas na venda.",
    ],
  },
  power_of_attorney: {
    title: "Procuracao",
    clauses: [
      "O comprador {{buyer.name}} autoriza os poderes necessarios para transferencia e regularizacao do veiculo {{vehicle.title}}, placa {{vehicle.plate}}.",
      "Os poderes ficam limitados aos atos administrativos vinculados a esta venda e aos dados cadastrados no sistema.",
      "Antes de uso externo, a loja deve conferir documentos pessoais, dados do veiculo, reconhecimento de firma e exigencias locais.",
    ],
  },
  reservation_receipt: {
    title: "Recibo de sinal",
    clauses: [
      "A loja declara ter recebido de {{buyer.name}} o sinal de {{finance.signalAmount}} para reserva do veiculo {{vehicle.title}}, placa {{vehicle.plate}}.",
      "O valor recebido foi registrado com a forma de pagamento {{finance.paymentMethod}} e fica vinculado a negociacao deste veiculo.",
      "A reserva nao transfere propriedade do veiculo e deve seguir o prazo, as condicoes comerciais e a trilha de auditoria da operacao.",
    ],
  },
  sale_contract: {
    title: "Contrato de compra e venda",
    clauses: [
      "A loja vende a {{buyer.name}} o veiculo {{vehicle.title}}, placa {{vehicle.plate}}, conforme dados cadastrados na operacao.",
      "O preco ajustado para a venda e de {{finance.salePrice}}, pago conforme a forma {{finance.paymentMethod}} e demais lancamentos vinculados.",
      "O comprador declara ciencia das caracteristicas, estado de conservacao, documentos apresentados e responsabilidades posteriores a entrega.",
      "As partes reconhecem que este contrato foi gerado a partir dos dados registrados no sistema e deve ser conferido antes de assinatura.",
    ],
  },
  sale_receipt: {
    title: "Recibo de venda",
    clauses: [
      "A loja registra o recebimento de {{finance.salePrice}} referente a venda do veiculo {{vehicle.title}} ao comprador {{buyer.name}}.",
      "O pagamento foi associado a forma {{finance.paymentMethod}} e aos lancamentos financeiros vinculados a esta operacao.",
      "Este recibo acompanha a venda registrada e deve ser arquivado junto aos demais documentos do veiculo.",
    ],
  },
};

export function listDefaultDocumentTemplates(): readonly DocumentTemplate[] {
  return documentTemplateKinds.map((kind) => {
    const template = defaultTemplate(kind);
    if (!template) throw new Error(`Missing default template: ${kind}`);
    return template;
  });
}

export function defaultTemplate(kind: DocumentKind): DocumentTemplate | null {
  if (!isTemplateKind(kind)) return null;
  const template = defaults[kind];
  return {
    availableVariables: variables,
    clauses: template.clauses,
    defaultClauses: template.clauses,
    defaultTitle: template.title,
    isCustomized: false,
    kind,
    title: template.title,
    updatedAt: null,
  };
}

export function mergeDocumentTemplate(
  kind: DocumentKind,
  override: {
    clauses: readonly string[];
    title: string;
    updatedAt: Date | null;
  } | null,
): DocumentTemplate | null {
  const fallback = defaultTemplate(kind);
  if (!fallback) return null;
  if (!override) return fallback;
  return {
    ...fallback,
    clauses: override.clauses,
    isCustomized: true,
    title: override.title,
    updatedAt: override.updatedAt,
  };
}

export function isTemplateKind(
  kind: DocumentKind,
): kind is (typeof documentTemplateKinds)[number] {
  return (documentTemplateKinds as readonly DocumentKind[]).includes(kind);
}
