import React from "react";
import {
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText as Text,
  DocumentPdfView as View,
  PdfLogoOrName,
  formatPdfDate,
  formatPdfDateTime,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { VehicleStoreBranding } from "../ports/vehicleStoreBrandingReader.js";
import type { VehicleChecklistOverview } from "../readModels/vehicleChecklistOverview.js";
import { fleetStyles } from "./vehicleChecklistReportStyles.js";
import {
  deriveFleetItemColumns,
  renderFleetRow,
} from "./vehicleChecklistFleetReportHelpers.js";

const e = React.createElement;
const s = fleetStyles;

/** V1-style fleet summary report (A4 landscape). */
export function buildFleetDocument(input: {
  branding?: VehicleStoreBranding | undefined;
  overview: VehicleChecklistOverview;
  scopeLabel: string;
}) {
  const storeName = input.branding?.name ?? "Loja Veículos";
  const generatedAt = input.overview.generatedAt;
  const itemColumns = deriveFleetItemColumns(input.overview.items);
  const notesWidth = `${48 - itemColumns.length * 5}%`;

  return e(
    DocumentPdfRoot,
    {
      author: storeName,
      creator: "Loja Veículos OS",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: "Resumo geral de checklists",
      title: "Resumo Geral de Checklists",
    },
    e(
      DocumentPdfPage,
      { orientation: "landscape", size: "A4", style: s.page },
      e(
        View,
        { style: s.header },
        e(
          View,
          { style: s.logoBox },
          e(PdfLogoOrName, {
            logoUrl: input.branding?.logoUrl ?? undefined,
            storeName,
          }),
        ),
        e(Text, { style: s.title }, "Resumo Geral de Checklists"),
        e(
          View,
          { style: { flexDirection: "row", gap: 10 } },
          e(Text, { style: s.subtitle }, storeName),
          e(Text, { style: s.subtitle }, "•"),
          e(Text, { style: s.subtitle }, formatPdfDate(generatedAt)),
        ),
      ),
      e(
        View,
        {
          style: {
            alignItems: "flex-end",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          },
        },
        e(
          Text,
          { style: s.sectionTitle },
          `Visão compacta por veículo (${input.overview.items.length} itens)`,
        ),
        e(
          Text,
          { style: { color: "#6b7280", fontSize: 9 } },
          "* Legenda das colunas no topo da tabela",
        ),
      ),
      e(
        View,
        { style: s.tableHeader },
        e(Text, { style: [s.th, { width: "22%" }] }, "Veículo"),
        e(Text, { style: [s.th, { width: "10%" }] }, "Status"),
        ...itemColumns.map((column) =>
          e(
            Text,
            {
              key: column.label,
              style: [s.th, { textAlign: "center", width: "5%" }],
            },
            column.heading,
          ),
        ),
        e(Text, { style: [s.th, { textAlign: "center", width: "8%" }] }, "%"),
        e(
          Text,
          { style: [s.th, { textAlign: "center", width: "12%" }] },
          "Atualizado",
        ),
        e(Text, { style: [s.th, { width: notesWidth }] }, "Observações"),
      ),
      ...input.overview.items.map((item) => renderFleetRow(item, itemColumns)),
      e(
        Text,
        { style: s.footer },
        `Documento gerado pelo sistema em ${formatPdfDateTime(generatedAt)}`,
      ),
    ),
  );
}
