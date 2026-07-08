import { fields, paragraph, table } from "./blockBuilders.js";
import type {
  DocumentTemplateDefinition,
  DocumentTemplateKey,
} from "./types.js";
import { variablesForContext } from "./variables.js";

export const lockedDocumentTemplates = [
  locked(
    "financial_report",
    "finance_receipt",
    "Relatorio financeiro",
    "report",
    [
      paragraph(
        "Relatorio financeiro por periodo com totais de despesas, receitas, saldo, saldo efetivado e categorias.",
      ),
      table(
        "Despesas por categoria",
        ["Categoria", "Qtd", "Total", "Pago"],
        "expense_categories",
      ),
      table(
        "Receitas por categoria",
        ["Categoria", "Qtd", "Total", "Recebido"],
        "revenue_categories",
      ),
    ],
    "RelatorioFinanceiroPDF.tsx",
  ),
  locked(
    "vehicle_checklist",
    "inspection",
    "Checklist do veiculo",
    "vehicle",
    [
      fields("Dados do veiculo", [
        { label: "Veiculo", token: "{{vehicle.title}}" },
        { label: "Placa", token: "{{vehicle.plate}}" },
        { label: "Km", token: "{{vehicle.km}}" },
      ]),
      table("Inspecao e documentacao", ["Item", "Status"], "vehicle_checklist"),
      paragraph(
        "Itens: manual, chave reserva, documento para rodar, CRV, pericia, preparacao e debitos quitados.",
      ),
    ],
    "VehicleChecklistPDF.tsx",
  ),
  locked(
    "vehicle_checklist_summary",
    "inspection",
    "Resumo geral de checklists",
    "report",
    [
      table(
        "Visao compacta por veiculo",
        [
          "Veiculo",
          "Status",
          "Manual",
          "Chave",
          "Doc.",
          "CRV",
          "Pericia",
          "Preparacao",
          "Debitos",
          "%",
        ],
        "vehicle_checklist_summary",
      ),
    ],
    "VehicleChecklistSummaryPDF.tsx",
  ),
  locked(
    "commission_seller_report",
    "finance_receipt",
    "Relatorio de comissoes",
    "report",
    [
      paragraph(
        "Relatorio de comissoes por vendedor, periodo, status, origem, nota e resumo de valores a pagar, pagos e totais.",
      ),
      table(
        "Lancamentos",
        ["Lancamento", "Referencia", "Origem", "Vencimento", "Status", "Valor"],
        "commission_lines",
      ),
    ],
    "CommissionsSellerReportPDF.tsx",
  ),
  locked(
    "owner_summary_report",
    "finance_receipt",
    "Resumo financeiro do dono",
    "report",
    [
      paragraph(
        "Resumo executivo com saldo realizado, receitas recebidas, custos pagos, lucro oficial, veiculos vendidos e pendencias.",
      ),
      table(
        "Veiculos vendidos no periodo",
        ["Veiculo", "Data", "Status", "Venda/Ganho", "Lucro"],
        "owner_vehicle_summary",
      ),
    ],
    "OwnerSummaryReportPDF.tsx",
  ),
  locked(
    "internal_invoice_control",
    "invoice",
    "Nota fiscal de controle interno",
    "fiscal",
    [
      paragraph(
        "Controle interno sem transmissao para Receita/SEFAZ, sem valor fiscal e sem XML fiscal.",
      ),
      fields("Documento auxiliar", [
        { label: "Numero", token: "{{document.number}}" },
        { label: "Emissao", token: "{{document.issuedAt}}" },
        { label: "Emitente", token: "{{store.name}}" },
      ]),
      table(
        "Produtos / servicos",
        [
          "Codigo",
          "Descricao",
          "NCM/Serv.",
          "CFOP",
          "Qtd.",
          "Unitario",
          "Total",
        ],
        "internal_invoice_items",
      ),
      table(
        "Calculo do imposto",
        ["Base", "ICMS", "ISS", "IPI", "PIS", "COFINS", "Total"],
        "internal_invoice_taxes",
      ),
    ],
    "NotaFiscalControleInterno.tsx",
  ),
] as const satisfies readonly DocumentTemplateDefinition[];

function locked(
  templateKey: DocumentTemplateKey,
  kind: string,
  title: string,
  context: DocumentTemplateDefinition["context"],
  defaultBlocks: DocumentTemplateDefinition["defaultBlocks"],
  migratedFrom: string,
): DocumentTemplateDefinition {
  return {
    availableVariables: variablesForContext(context).map((item) => item.token),
    category: "Gerados pelo sistema",
    context,
    defaultBlocks,
    description:
      "Renderer migrado do V1. Conteudo operacional gerado por dados, nao por edicao livre.",
    kind,
    locale: "pt-BR",
    migratedFrom,
    mode: "locked",
    source: "system",
    templateKey,
    title,
  };
}
