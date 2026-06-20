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
      "As partes registram a entrega do veiculo descrito e a ciencia das condicoes cadastradas.",
      "O comprador declara ter recebido o veiculo e os documentos informados pela loja.",
    ],
  },
  power_of_attorney: {
    title: "Procuracao",
    clauses: [
      "Documento-base para poderes de transferencia conforme dados da venda registrada.",
      "A loja deve revisar os dados das partes antes de usar este documento fora do sistema.",
    ],
  },
  reservation_receipt: {
    title: "Recibo de sinal",
    clauses: [
      "A loja declara o recebimento do sinal informado para reserva do veiculo descrito.",
      "A reserva deve manter trilha de auditoria do comprador, valor, metodo e operador.",
    ],
  },
  sale_contract: {
    title: "Contrato de compra e venda",
    clauses: [
      "Contrato-base de compra e venda gerado a partir da venda registrada no sistema.",
      "As condicoes comerciais seguem os valores, veiculo e comprador informados nesta operacao.",
    ],
  },
  sale_receipt: {
    title: "Recibo de venda",
    clauses: [
      "A loja registra o recebimento do valor informado para a venda do veiculo.",
      "Este recibo acompanha a venda registrada e seus respectivos pagamentos.",
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
