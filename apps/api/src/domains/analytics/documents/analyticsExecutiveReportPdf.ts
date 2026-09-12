import React from "react";
import {
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText as Text,
  DocumentPdfView as View,
  renderDocumentPdf,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { AnalyticsDashboard } from "../ports/analyticsRepository.js";
import { executiveReportStyles as styles } from "./analyticsExecutiveReportStyles.js";

const e = React.createElement;
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export async function renderAnalyticsExecutiveReportPdf(
  dashboard: AnalyticsDashboard,
): Promise<Uint8Array> {
  return renderDocumentPdf(buildExecutiveReportDocument(dashboard));
}

function buildExecutiveReportDocument(dashboard: AnalyticsDashboard) {
  const pendingCount =
    dashboard.owner.missingAcquisitionCount +
    dashboard.attention.pendingChecklistsCount;

  return e(
    DocumentPdfRoot,
    {
      author: "Loja Veículos OS",
      creator: "Loja Veículos OS",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: `Indicadores comerciais de ${periodLabel(dashboard)}`,
      title: "Relatório executivo",
    },
    e(
      DocumentPdfPage,
      { size: "A4", style: styles.page },
      e(
        View,
        { style: styles.header },
        e(Text, { style: styles.eyebrow }, "Desempenho da loja"),
        e(Text, { style: styles.title }, "Relatório executivo"),
        e(Text, { style: styles.subtitle }, periodLabel(dashboard)),
      ),
      e(
        View,
        { style: styles.metricGrid },
        metric(
          "Saldo realizado",
          money(dashboard.finance.realizedBalanceCents),
        ),
        metric(
          "Receitas recebidas",
          money(dashboard.finance.receivedRevenueCents),
        ),
        metric("Saídas pagas", money(dashboard.finance.paidOutflowCents)),
        metric("Veículos vendidos", count(dashboard.sales.closedCount)),
        metric("Margem apurada", money(dashboard.owner.officialMarginCents)),
        metric("Pendências", count(pendingCount)),
      ),
      dashboard.owner.missingAcquisitionCount > 0
        ? e(
            Text,
            { style: styles.warning },
            `${count(dashboard.owner.missingAcquisitionCount)} venda(s) sem aquisição registrada não compõem a margem apurada.`,
          )
        : null,
      section(
        "Vendas e estoque",
        summaryRow(
          "Receita de vendas",
          nullableMoney(dashboard.sales.revenueCents),
        ),
        summaryRow(
          "Ticket médio",
          nullableMoney(dashboard.sales.avgTicketCents),
        ),
        summaryRow(
          "Margem bruta",
          nullableMoney(dashboard.sales.grossMarginCents),
        ),
        summaryRow(
          "Estoque disponível",
          count(dashboard.inventory.availableListings),
        ),
        summaryRow(
          "Valor anunciado disponível",
          money(dashboard.inventory.availableAskingValueCents),
        ),
        summaryRow("Reservados", count(dashboard.inventory.reservedListings)),
      ),
      section(
        "Veículos vendidos no período",
        dashboard.owner.vehicles.length
          ? vehicleTable(dashboard)
          : e(Text, { style: styles.mutedText }, "Nenhuma venda no período."),
      ),
      e(
        Text,
        { fixed: true, style: styles.footer },
        `Gerado em ${dateTime(dashboard.generatedAt)} pelo Loja Veículos OS`,
      ),
    ),
  );
}

function vehicleTable(dashboard: AnalyticsDashboard) {
  return e(
    View,
    null,
    e(
      View,
      { fixed: true, style: styles.tableHeader },
      tableCell("Veículo", "28%", true),
      tableCell("Venda", "18%", true),
      tableCell("Custos", "18%", true),
      tableCell("Comissão", "18%", true),
      tableCell("Margem", "18%", true),
    ),
    ...dashboard.owner.vehicles.map((vehicle) =>
      e(
        View,
        { key: vehicle.saleId, style: styles.tableRow, wrap: false },
        e(
          View,
          { style: { width: "28%" } },
          e(Text, { style: styles.tableText }, vehicle.title),
          e(
            Text,
            { style: styles.mutedText },
            [vehicle.plate, date(vehicle.closedAt)].filter(Boolean).join(" · "),
          ),
        ),
        tableCell(money(vehicle.salePriceCents), "18%"),
        tableCell(money(vehicle.totalCostCents), "18%"),
        tableCell(money(vehicle.commissionCents), "18%"),
        tableCell(
          vehicle.marginCents === null
            ? "Aquisição pendente"
            : money(vehicle.marginCents),
          "18%",
        ),
      ),
    ),
  );
}

function metric(label: string, value: string) {
  return e(
    View,
    { style: styles.metric },
    e(Text, { style: styles.metricLabel }, label),
    e(Text, { style: styles.metricValue }, value),
  );
}

function section(title: string, ...children: React.ReactNode[]) {
  return e(
    View,
    { style: styles.section },
    e(Text, { style: styles.sectionTitle }, title),
    ...children,
  );
}

function summaryRow(label: string, value: string) {
  return e(
    View,
    { style: styles.summaryRow },
    e(Text, { style: styles.summaryLabel }, label),
    e(Text, { style: styles.summaryValue }, value),
  );
}

function tableCell(value: string, width: string, header = false) {
  return e(
    Text,
    {
      style: [header ? styles.tableHeaderText : styles.tableText, { width }],
    },
    value,
  );
}

function money(cents: number) {
  return moneyFormatter.format(cents / 100);
}

function nullableMoney(cents: number | null) {
  return cents === null ? "Acesso restrito" : money(cents);
}

function count(value: number) {
  return value.toLocaleString("pt-BR");
}

function date(value: Date) {
  return value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dateTime(value: Date) {
  return value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function periodLabel(dashboard: AnalyticsDashboard) {
  return `${formatIsoDate(dashboard.period.from)} a ${formatIsoDate(dashboard.period.to)}`;
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
