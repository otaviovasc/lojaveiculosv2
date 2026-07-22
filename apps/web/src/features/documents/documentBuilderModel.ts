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
  const id = generateBlockId("fields");
  return {
    id,
    type: "field_grid",
    title,
    fields: [
      { label: "Veículo", token: "{{vehicle.label}}" },
      { label: "Placa", token: "{{vehicle.plate}}" },
      { label: "Comprador", token: "{{buyer.name}}" },
      { label: "CPF/CNPJ", token: "{{buyer.cpf}}" },
    ],
  };
}

export function createSignatureBlock(
  title = "Assinaturas das Partes",
): DocumentTemplateBlock {
  const id = generateBlockId("sig");
  return {
    id,
    type: "signature",
    title,
    roles: [
      "{{store.name}} (Vendedora)",
      "{{buyer.name}} (Comprador)",
      "Testemunha 1",
      "Testemunha 2",
    ],
  };
}

export function createTableBlock(
  title = "Detalhamento Financeiro",
): DocumentTemplateBlock {
  const id = generateBlockId("tbl");
  return {
    id,
    type: "table",
    title,
    columns: [
      "Item / Descrição",
      "Forma de Pagamento",
      "Vencimento",
      "Valor (R$)",
    ],
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
    body: "O COMPRADOR {{buyer.name}} compromete-se expressamente a efetuar a transferência de propriedade do veículo {{vehicle.label}}, placa {{vehicle.plate}}, para o seu nome no prazo máximo de 30 (trinta) dias corridos a contar da data de entrega, sob pena de responsabilização civil e administrativa por eventuais sanções.",
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
    body: "O COMPRADOR declara haver vistoriado previamente o veículo {{vehicle.label}}, inspecionado seus componentes internos, pintura, estofamento, pneus e acessórios, concordando expressamente com o seu estado atual de conservação e funcionamento no ato do recebimento.",
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
    body: "O descumprimento unjustificado de qualquer das obrigações assumidas neste instrumento facultará à parte inocente a rescisão imediata do contrato, mediante aplicação de multa compensatória correspondente a 10% (dez por cento) sobre o valor total negociado de {{sale.price}}.",
    category: "Rescisão",
    description:
      "Multa de 10% sobre a negociação em caso de desistência ou descumprimento.",
    title: "Cláusula Penal e Multa por Rescisão Contratual",
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
