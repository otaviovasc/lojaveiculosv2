import React from "react";
import {
  DocumentPdfText,
  DocumentPdfView,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { VehicleChecklistItemStatus } from "../ports/vehicleChecklistRepository.js";
import type { VehicleChecklistOverviewItem } from "../readModels/vehicleChecklistOverview.js";
import { fleetStyles } from "./vehicleChecklistReportStyles.js";
import {
  formatDateTime,
  unitStatusLabel,
} from "./vehicleChecklistDetailedReport.js";

const e = React.createElement;
const s = fleetStyles;

export const fleetTableMaxItemColumns = 7;

export type FleetItemColumn = {
  heading: string;
  label: string;
};

/** Union of checklist item labels across the fleet, capped for A4 landscape. */
export function deriveFleetItemColumns(
  items: readonly VehicleChecklistOverviewItem[],
): readonly FleetItemColumn[] {
  const labels: string[] = [];
  for (const item of items) {
    for (const checklist of item.checklists) {
      for (const checklistItem of checklist.items) {
        if (!labels.includes(checklistItem.label)) {
          labels.push(checklistItem.label);
        }
        if (labels.length >= fleetTableMaxItemColumns) return columns(labels);
      }
    }
  }
  return columns(labels);
}

function columns(labels: readonly string[]): readonly FleetItemColumn[] {
  return labels.map((label) => ({ heading: abbreviate(label), label }));
}

function abbreviate(label: string): string {
  const firstWord =
    label.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().split(/\s+/)[0] ?? label;
  return firstWord.slice(0, 4).toUpperCase();
}

export function renderFleetRow(
  item: VehicleChecklistOverviewItem,
  itemColumns: readonly FleetItemColumn[],
) {
  const year = [item.listing.manufactureYear, item.listing.modelYear]
    .filter(Boolean)
    .join("/");
  const subtitle = [
    year || null,
    item.unit.plate ? `Placa ${item.unit.plate}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const checklistItems = item.checklists.flatMap(
    (checklist) => checklist.items,
  );

  return e(
    DocumentPdfView,
    { key: item.unit.id, style: s.tableRow, wrap: false },
    e(
      DocumentPdfView,
      { style: { width: "22%" } },
      e(
        DocumentPdfText,
        { style: [s.td, { fontFamily: "Helvetica-Bold", fontWeight: "bold" }] },
        item.listing.title,
      ),
      subtitle
        ? e(
            DocumentPdfText,
            { style: [s.td, { color: "#6b7280", fontSize: 7.5 }] },
            subtitle,
          )
        : null,
    ),
    e(
      DocumentPdfView,
      { style: { width: "10%" } },
      e(
        DocumentPdfText,
        { style: [s.td, s.statusBadge] },
        unitStatusLabel(item.unit.status),
      ),
    ),
    ...itemColumns.map((column) => {
      const status = checklistItems.find(
        (checklistItem) => checklistItem.label === column.label,
      )?.status;
      return e(
        DocumentPdfText,
        {
          key: column.label,
          style: [
            s.td,
            { textAlign: "center", width: "5%" },
            statusCellStyle(status),
          ],
        },
        statusCellLabel(status),
      );
    }),
    e(
      DocumentPdfText,
      {
        style: [
          s.td,
          {
            fontFamily: "Helvetica-Bold",
            fontWeight: "bold",
            textAlign: "center",
            width: "8%",
          },
          completionColor(item.metrics.progressPercent),
        ],
      },
      `${item.metrics.progressPercent}%`,
    ),
    e(
      DocumentPdfText,
      { style: [s.td, { textAlign: "center", width: "12%" }] },
      formatDateTime(item.updatedAt),
    ),
    e(
      DocumentPdfText,
      { style: [s.td, { width: `${48 - itemColumns.length * 5}%` }] },
      fleetRowNotes(item),
    ),
  );
}

function statusCellLabel(status: VehicleChecklistItemStatus | undefined) {
  if (status === "passed") return "Sim";
  if (status === undefined || status === "waived") return "—";
  return "Não";
}

function statusCellStyle(status: VehicleChecklistItemStatus | undefined) {
  if (status === "passed") return s.statusYes;
  if (status === "failed" || status === "pending") return s.statusNo;
  return {};
}

function completionColor(percent: number) {
  if (percent === 100) return { color: "#10b981" };
  if (percent < 50) return { color: "#ef4444" };
  return { color: "#111827" };
}

function fleetRowNotes(item: VehicleChecklistOverviewItem) {
  const note = item.checklists
    .flatMap((checklist) => checklist.items)
    .map((checklistItem) => checklistItem.notes?.trim())
    .find((value): value is string => Boolean(value));
  return note ?? "-";
}
