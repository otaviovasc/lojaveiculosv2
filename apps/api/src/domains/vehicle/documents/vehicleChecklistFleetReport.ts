import React from "react";
import {
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText,
  DocumentPdfView,
  DocumentPdfHeader,
  DocumentPdfFooter,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import { styles as sharedStyles } from "../../documents/render/reactPdfDocumentStyles.js";
import type { VehicleStoreBranding } from "../ports/vehicleStoreBrandingReader.js";
import type { VehicleChecklistOverview } from "../readModels/vehicleChecklistOverview.js";
import { customStyles } from "./vehicleChecklistReportStyles.js";
import {
  resolveContactLine,
  initials,
} from "./vehicleChecklistDetailedReport.js";
import {
  renderSummaryCard,
  renderFleetRows,
} from "./vehicleChecklistFleetReportHelpers.js";

const e = React.createElement;

export function buildFleetDocument(input: {
  branding?: VehicleStoreBranding | undefined;
  overview: VehicleChecklistOverview;
  scopeLabel: string;
}) {
  const storeName = input.branding?.name ?? "Loja Veículos";
  const title = "Relatório geral de checklists";
  const subtitle = `${input.overview.summary.unitCount} veículos no recorte selecionado`;

  const brand = {
    contactLine: resolveContactLine(input.branding),
    logoText: initials(storeName),
    storeDocument: input.branding?.document ?? undefined,
    storeName,
  };

  const rows = renderFleetRows(input.overview.items);

  return e(
    DocumentPdfRoot,
    {
      author: storeName,
      creator: "Loja Veículos OS",
      keywords: "loja veículos, documento automotivo, fluxo operacional",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: subtitle,
      title,
    },
    e(
      DocumentPdfPage,
      { size: "A4", style: sharedStyles.page },
      e(DocumentPdfHeader, {
        brand,
        subtitle,
        title,
      }),
      e(DocumentPdfFooter, { storeName }),
      e(
        DocumentPdfView,
        { style: sharedStyles.body },
        e(
          DocumentPdfView,
          { style: customStyles.summaryGrid },
          renderSummaryCard(
            String(input.overview.summary.unitCount),
            "Veículos",
          ),
          renderSummaryCard(
            String(input.overview.summary.checklistCount),
            "Checklists",
          ),
          renderSummaryCard(
            `${input.overview.summary.progressPercent}%`,
            "Conclusão Real",
          ),
          renderSummaryCard(
            String(input.overview.summary.pendingItemCount),
            "Pendentes",
          ),
          renderSummaryCard(
            String(input.overview.summary.failedItemCount),
            "Reprovados",
          ),
        ),
        e(
          DocumentPdfView,
          { style: customStyles.table },
          e(
            DocumentPdfView,
            { style: customStyles.tableHeader },
            e(
              DocumentPdfView,
              { style: { width: "32%" } },
              e(
                DocumentPdfText,
                { style: customStyles.tableHeaderCell },
                "Veículo",
              ),
            ),
            e(
              DocumentPdfView,
              { style: { width: "13%" } },
              e(
                DocumentPdfText,
                { style: customStyles.tableHeaderCell },
                "Estoque",
              ),
            ),
            e(
              DocumentPdfView,
              { style: { width: "15%" } },
              e(
                DocumentPdfText,
                { style: customStyles.tableHeaderCell },
                "Situação",
              ),
            ),
            e(
              DocumentPdfView,
              { style: { width: "15%" } },
              e(
                DocumentPdfText,
                { style: customStyles.tableHeaderCell },
                "Progresso",
              ),
            ),
            e(
              DocumentPdfView,
              { style: { width: "12%" } },
              e(
                DocumentPdfText,
                { style: customStyles.tableHeaderCell },
                "Pendências",
              ),
            ),
            e(
              DocumentPdfView,
              { style: { width: "13%" } },
              e(
                DocumentPdfText,
                { style: customStyles.tableHeaderCell },
                "Atualização",
              ),
            ),
          ),
          ...rows,
        ),
      ),
    ),
  );
}
