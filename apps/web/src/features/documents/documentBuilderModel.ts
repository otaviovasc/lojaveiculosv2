import {
  interpolateSampleVariables,
  sampleValue,
} from "@lojaveiculosv2/documents";
import type {
  DocumentKind,
  DocumentTemplate,
  DocumentTemplateBlock,
  DocumentTemplateSuggestion,
} from "./types";

export type DocumentBuilderDraft = {
  blocks: DocumentTemplateBlock[];
  title: string;
};

export type DocumentBuilderSaveState =
  "dirty" | "error" | "idle" | "saved" | "saving";

export type DocumentBuilderStatusTone =
  "dirty" | "error" | "idle" | "locked" | "saved" | "saving";

export type DocumentBuilderStatus = {
  label: string;
  tone: DocumentBuilderStatusTone;
};

export function createDocumentBuilderDraft(
  template: DocumentTemplate | null,
): DocumentBuilderDraft {
  if (!template) return { blocks: [], title: "" };
  return {
    blocks: cloneBlocks(template.blocks),
    title: template.title,
  };
}

export function createDefaultDocumentBuilderDraft(
  template: DocumentTemplate,
): DocumentBuilderDraft {
  return {
    blocks: cloneBlocks(template.defaultBlocks),
    title: template.defaultTitle,
  };
}

export function documentBuilderClauses(
  blocks: readonly DocumentTemplateBlock[],
) {
  const clauses = blocks.flatMap((block) => {
    if (block.type === "clause" || block.type === "paragraph") {
      return block.body.trim() ? [block.body.trim()] : [];
    }
    return [];
  });
  return clauses.length ? clauses : ["Documento em branco."];
}

export function createClauseBlock(
  body = "",
  label = "Nova cláusula",
): DocumentTemplateBlock {
  const id = generateBlockId("clause");
  return {
    body,
    id,
    label,
    type: "clause",
  };
}

export function createHeadingBlock(
  text = "Novo Título de Seção",
): DocumentTemplateBlock {
  const id = generateBlockId("heading");
  return {
    id,
    type: "heading",
    text,
  };
}

export function createFieldGridBlock(
  title = "Campos e Dados da Operação",
): DocumentTemplateBlock {
  return createVehicleFieldsBlock(title);
}

export function createVehicleFieldsBlock(
  title = "Dados do Veículo",
): DocumentTemplateBlock {
  const id = generateBlockId("fields_vehicle");
  return {
    fields: [
      { label: "Veículo", token: "{{vehicle.title}}" },
      { label: "Placa", token: "{{vehicle.plate}}" },
      { label: "RENAVAM", token: "{{vehicle.renavam}}" },
      { label: "Chassi", token: "{{vehicle.chassis}}" },
      { label: "Quilometragem", token: "{{vehicle.km}}" },
      { label: "Cor", token: "{{vehicle.color}}" },
    ],
    id,
    title,
    type: "field_grid",
  };
}

export function createBuyerFieldsBlock(
  title = "Dados do Comprador",
): DocumentTemplateBlock {
  const id = generateBlockId("fields_buyer");
  return {
    fields: [
      { label: "Comprador", token: "{{buyer.name}}" },
      { label: "Documento (CPF/CNPJ)", token: "{{buyer.document}}" },
      { label: "Endereço", token: "{{buyer.address}}" },
    ],
    id,
    title,
    type: "field_grid",
  };
}

export function createFinanceFieldsBlock(
  title = "Dados do Pagamento e Operação",
): DocumentTemplateBlock {
  const id = generateBlockId("fields_finance");
  return {
    fields: [
      { label: "Valor da venda", token: "{{finance.salePrice}}" },
      { label: "Forma de pagamento", token: "{{finance.paymentMethod}}" },
      { label: "Sinal de reserva", token: "{{finance.signalAmount}}" },
      { label: "Número do documento", token: "{{document.number}}" },
    ],
    id,
    title,
    type: "field_grid",
  };
}

export function createDriverFieldsBlock(
  title = "Dados do Condutor",
): DocumentTemplateBlock {
  const id = generateBlockId("fields_driver");
  return {
    fields: [
      { label: "Nome do condutor", token: "{{driver.name}}" },
      { label: "Documento (CPF)", token: "{{driver.document}}" },
    ],
    id,
    title,
    type: "field_grid",
  };
}

export function createSignatureBlock(
  title = "Assinaturas das Partes",
): DocumentTemplateBlock {
  return createSaleSignaturesBlock(title);
}

export function createSaleSignaturesBlock(
  title = "Assinaturas de Compra e Venda",
): DocumentTemplateBlock {
  const id = generateBlockId("sig_sale");
  return {
    id,
    roles: [
      "{{store.name}} (Vendedora)",
      "{{buyer.name}} (Comprador)",
      "Testemunha 1",
      "Testemunha 2",
    ],
    title,
    type: "signature",
  };
}

export function createTestDriveSignaturesBlock(
  title = "Assinatura do Test Drive",
): DocumentTemplateBlock {
  const id = generateBlockId("sig_testdrive");
  return {
    id,
    roles: ["{{store.name}} (Loja)", "{{driver.name}} (Condutor)"],
    title,
    type: "signature",
  };
}

export function createConsignmentSignaturesBlock(
  title = "Assinatura de Consignação",
): DocumentTemplateBlock {
  const id = generateBlockId("sig_consignment");
  return {
    id,
    roles: ["Consignante", "{{store.name}} (Loja)"],
    title,
    type: "signature",
  };
}

export function createReceiptSignaturesBlock(
  title = "Assinatura do Recibo",
): DocumentTemplateBlock {
  const id = generateBlockId("sig_receipt");
  return {
    id,
    roles: ["Quem pagou", "Quem recebeu"],
    title,
    type: "signature",
  };
}

export function createTableBlock(
  title = "Detalhamento Financeiro",
): DocumentTemplateBlock {
  return createPaymentTableBlock(title);
}

export function createPaymentTableBlock(
  title = "Parcelas e Pagamentos",
): DocumentTemplateBlock {
  const id = generateBlockId("tbl_payments");
  return {
    columns: [
      "Forma de Pagamento",
      "Descrição / Banco",
      "Vencimento / Data",
      "Valor (R$)",
    ],
    id,
    preset: "sale_payments",
    title,
    type: "table",
  };
}

export function createFinanceDetailTableBlock(
  title = "Detalhamento de Valores e Custos",
): DocumentTemplateBlock {
  const id = generateBlockId("tbl_finance");
  return {
    columns: ["Item / Componente", "Forma de Liberação", "Prazo", "Valor (R$)"],
    id,
    title,
    type: "table",
  };
}

function generateBlockId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export type PremadeClause = {
  body: string;
  category:
    | "Garantia"
    | "Transferência"
    | "Débitos"
    | "Vistoria"
    | "Infrações"
    | "Rescisão"
    | "LGPD"
    | "Venda no Estado"
    | "Consignação"
    | "Procuração"
    | "Test Drive"
    | "Reserva"
    | "Foro";
  description: string;
  title: string;
};

export const PREMADE_CLAUSES: PremadeClause[] = [
  {
    body: "O veículo objeto deste contrato possui garantia legal de 90 (noventa) dias contra defeitos de funcionamento exclusivamente no motor e caixa de câmbio, conforme previsto no Artigo 26 do Código de Defesa do Consumidor. A garantia não cobre desgaste natural de peças ou mau uso pelo comprador.",
    category: "Garantia",
    description:
      "Cobertura legal obrigatória conforme CDC para defeitos mecânicos principais.",
    title: "Garantia Legal de 90 Dias (Motor e Câmbio)",
  },
  {
    body: "O COMPRADOR {{buyer.name}} compromete-se expressamente a efetuar a transferência de propriedade do veículo {{vehicle.title}}, placa {{vehicle.plate}}, para o seu nome no prazo máximo de 30 (trinta) dias corridos a contar da data de entrega, sob pena de responsabilização civil e administrativa por eventuais sanções.",
    category: "Transferência",
    description:
      "Obrigação do comprador de transferir a documentação no DETRAN.",
    title: "Prazo de Transferência de Propriedade (30 dias)",
  },
  {
    body: "A VENDEDORA {{store.name}} declara que o veículo é entregue livre e desembaraçado de quaisquer ônus, débitos de IPVA, licenciamento, multas ou gravames anteriores à data de entrega, responsabilizando-se integralmente pela quitação de eventuais pendências anteriores a esta data.",
    category: "Débitos",
    description:
      "Garantia da loja de entrega do veículo livre de ônus ou multas anteriores.",
    title: "Inexistência de Débitos e Restrições Anteriores",
  },
  {
    body: "O COMPRADOR declara haver vistoriado previamente o veículo {{vehicle.title}}, inspecionado seus componentes internos, pintura, estofamento, pneus e acessórios, concordando expressamente com o seu estado atual de conservação e funcionamento no ato do recebimento.",
    category: "Vistoria",
    description:
      "Aceite do comprador quanto ao estado estético e mecânico no ato de entrega.",
    title: "Vistoria prévia e Estado de Conservação",
  },
  {
    body: "A partir da data e horário da entrega do veículo ao COMPRADOR {{buyer.name}}, todas as infrações de trânsito, multas, pontuações na CNH, tributos vincendos e eventuais danos causados a terceiros serão de inteira e exclusiva responsabilidade do COMPRADOR.",
    category: "Infrações",
    description:
      "Atribuição de responsabilidade sobre multas e pontuação a partir da entrega.",
    title: "Responsabilidade por Infrações e Multas Futuras",
  },
  {
    body: "O descumprimento injustificado de qualquer das obrigações assumidas neste instrumento facultará à parte inocente a rescisão imediata do contrato, mediante aplicação de multa compensatória correspondente a 10% (dez por cento) sobre o valor total negociado de {{finance.salePrice}}.",
    category: "Rescisão",
    description:
      "Multa de 10% sobre a negociação em caso de desistência ou descumprimento.",
    title: "Cláusula Penal e Multa por Rescisão Contratual",
  },
  {
    body: "Os dados pessoais coletados neste instrumento serão tratados exclusivamente para fins de execução e formalização do contrato e cumprimento de obrigações legais, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018 - LGPD).",
    category: "LGPD",
    description:
      "Tratamento de dados pessoais e privacidade em conformidade com a LGPD.",
    title: "Proteção de Dados Pessoais e LGPD",
  },
  {
    body: "O COMPRADOR declara ter ciência inequívoca de que o veículo é comercializado no estado em que se encontra, sem garantias complementares, aceitando o seu estado de conservação e mecânica atual.",
    category: "Venda no Estado",
    description:
      "Cláusula de venda no estado com exclusão de garantia contratual adicional.",
    title: "Venda no Estado e Aceite de Condições",
  },
  {
    body: "O CONSIGNANTE entrega o veículo {{vehicle.title}}, placa {{vehicle.plate}}, autorizando a {{store.name}} a intermediar sua comercialização pelo valor autorizado registrado na operação.",
    category: "Consignação",
    description:
      "Autorização e regras de intermediação e consignação de veículo.",
    title: "Intermediação e Consignação de Veículo",
  },
  {
    body: "O Outorgante confere à Outorgada poderes especiais para representá-lo perante órgãos de trânsito para transferência, regularização e emissão de ATPV-e do veículo {{vehicle.title}}, placa {{vehicle.plate}}.",
    category: "Procuração",
    description:
      "Poderes de representação para transferência e emissão de documentação DETRAN.",
    title: "Poderes para Transferência e ATPV-e",
  },
  {
    body: "O condutor {{driver.name}} assume total responsabilidade por infrações de trânsito, sinistros e danos ocorridos durante a realização do test drive no veículo {{vehicle.title}}.",
    category: "Test Drive",
    description:
      "Isenção da loja e responsabilidade do condutor em test drive.",
    title: "Responsabilidade e Isenção em Test Drive",
  },
  {
    body: "Recebemos o valor de {{finance.signalAmount}} referente ao sinal de reserva do veículo {{vehicle.title}}, que será abatido do valor final na quitação.",
    category: "Reserva",
    description: "Recibo de sinal e garantia de reserva do veículo.",
    title: "Sinal de Reserva e Abatimento",
  },
  {
    body: "Para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, as partes elegem o Foro da Comarca de domicílio da VENDEDORA {{store.name}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
    category: "Foro",
    description:
      "Definição do foro da comarca da loja para dirimir controvérsias.",
    title: "Foro de Eleição e Resolução de Conflitos",
  },
];

export type TemplateClauseBankItem = {
  body: string;
  label: string;
};

export type TemplateClauseGroup = {
  clauses: TemplateClauseBankItem[];
  templateKey: string;
  templateTitle: string;
};

export function collectTemplateClauseBank(
  templates: readonly DocumentTemplate[],
): TemplateClauseGroup[] {
  const groups: TemplateClauseGroup[] = [];
  for (const template of templates) {
    if (template.mode === "locked") continue;
    const seenBodies = new Set<string>();
    const clauses: TemplateClauseBankItem[] = [];
    for (const block of template.blocks) {
      if (block.type !== "clause" && block.type !== "paragraph") continue;
      const body = block.body.trim();
      if (!body || seenBodies.has(body)) continue;
      seenBodies.add(body);
      clauses.push({
        body,
        label: block.label ?? `Cláusula ${clauses.length + 1}`,
      });
    }
    if (clauses.length) {
      groups.push({
        clauses,
        templateKey: template.templateKey,
        templateTitle: template.title,
      });
    }
  }
  return groups.sort((a, b) =>
    a.templateTitle.localeCompare(b.templateTitle, "pt-BR"),
  );
}

export function updateBlockBody(
  block: DocumentTemplateBlock,
  body: string,
): DocumentTemplateBlock {
  if (block.type !== "clause" && block.type !== "paragraph") return block;
  return { ...block, body };
}

export function applyDocumentBuilderSuggestion(
  suggestion: DocumentTemplateSuggestion,
): DocumentBuilderDraft {
  return {
    blocks: suggestion.appliedBlocks.length
      ? cloneBlocks(suggestion.appliedBlocks)
      : clausesToBlocks(suggestion.appliedClauses),
    title: suggestion.appliedTitle,
  };
}

export function templateKindLabel(kind: DocumentKind) {
  const labels: Partial<Record<DocumentKind, string>> = {
    delivery_term: "Entrega",
    finance_receipt: "Financeiro",
    inspection: "Checklist",
    internal: "Interno",
    invoice: "Fiscal",
    other: "Outro",
    power_of_attorney: "Procuração",
    reservation_receipt: "Reserva",
    sale_contract: "Contrato",
    sale_receipt: "Recibo",
    test_drive: "Test drive",
  };
  return labels[kind] ?? kind;
}

export function blockTitle(block: DocumentTemplateBlock, index: number) {
  if (block.type === "heading") return block.text || `Título ${index + 1}`;
  if (block.type === "field_grid") return block.title;
  if (block.type === "signature") return block.title ?? "Assinaturas";
  if (block.type === "table") return block.title;
  return block.label ?? `Bloco ${index + 1}`;
}

const blockTypeLabels: Record<DocumentTemplateBlock["type"], string> = {
  clause: "Cláusula",
  field_grid: "Campos",
  heading: "Título",
  paragraph: "Parágrafo",
  signature: "Assinaturas",
  table: "Tabela",
};

export function blockTypeLabel(type: DocumentTemplateBlock["type"]) {
  return blockTypeLabels[type] ?? type;
}

export function sampleVariable(token: string) {
  return sampleValue(token);
}

export function renderSampleText(value: string) {
  return interpolateSampleVariables(value);
}

function cloneBlocks(
  blocks: readonly DocumentTemplateBlock[],
): DocumentTemplateBlock[] {
  return blocks.map((block) => structuredClone(block));
}

function clausesToBlocks(clauses: readonly string[]): DocumentTemplateBlock[] {
  return clauses.map((body, index) => ({
    body,
    id: `suggested_clause_${index + 1}`,
    label: `Cláusula ${index + 1}`,
    type: "clause",
  }));
}
