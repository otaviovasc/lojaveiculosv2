import React from "react";
import {
  DocumentPdfText,
  DocumentPdfView,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { VehicleChecklistOverviewItem } from "../readModels/vehicleChecklistOverview.js";
import {
  customStyles,
  getOverviewStatusBadgeStyle,
  getUnitStatusBadgeStyle,
  overviewStatusLabel,
} from "./vehicleChecklistReportStyles.js";
import {
  formatDateTime,
  unitStatusLabel,
} from "./vehicleChecklistDetailedReport.js";

const e = React.createElement;

export function renderSummaryCard(value: string, label: string) {
  return e(
    DocumentPdfView,
    { style: customStyles.summaryCard },
    e(DocumentPdfText, { style: customStyles.summaryValue }, value),
    e(DocumentPdfText, { style: customStyles.summaryLabel }, label),
  );
}

export function renderFleetRows(
  items: readonly VehicleChecklistOverviewItem[],
) {
  return items.map((item, index) => {
    const isEven = index % 2 === 0;
    const year = [item.listing.manufactureYear, item.listing.modelYear]
      .filter(Boolean)
      .join("/");
    const subtitleText = [
      year || null,
      item.unit.plate ? `Placa ${item.unit.plate}` : null,
      item.unit.stockNumber ? `Estoque ${item.unit.stockNumber}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return e(
      DocumentPdfView,
      {
        key: item.unit.id,
        style: isEven
          ? [customStyles.tableRow, customStyles.tableRowEven]
          : customStyles.tableRow,
      },
      e(
        DocumentPdfView,
        { style: { width: "32%" } },
        e(
          DocumentPdfText,
          { style: [customStyles.tableCell, customStyles.vehicleTitle] },
          item.listing.title,
        ),
        e(
          DocumentPdfText,
          { style: customStyles.vehicleSubtitle },
          subtitleText,
        ),
      ),
      e(
        DocumentPdfView,
        { style: { width: "13%" } },
        e(
          DocumentPdfText,
          { style: getUnitStatusBadgeStyle(item.unit.status) },
          unitStatusLabel(item.unit.status),
        ),
      ),
      e(
        DocumentPdfView,
        { style: { width: "15%" } },
        e(
          DocumentPdfText,
          { style: getOverviewStatusBadgeStyle(item.status) },
          overviewStatusLabel(item.status),
        ),
      ),
      e(
        DocumentPdfView,
        { style: { width: "15%" } },
        e(
          DocumentPdfText,
          { style: customStyles.tableCell },
          `${item.metrics.resolvedItemCount}/${item.metrics.itemCount} (${item.metrics.progressPercent}%)`,
        ),
      ),
      e(
        DocumentPdfView,
        { style: { width: "12%" } },
        e(
          DocumentPdfText,
          {
            style:
              item.metrics.failedItemCount > 0
                ? [customStyles.tableCell, customStyles.failedCount]
                : customStyles.tableCell,
          },
          `${item.metrics.failedItemCount} reprovados`,
        ),
      ),
      e(
        DocumentPdfView,
        { style: { width: "13%" } },
        e(
          DocumentPdfText,
          { style: customStyles.tableCell },
          formatDateTime(item.updatedAt),
        ),
      ),
    );
  });
}
