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
import type { VehicleChecklistItem } from "../ports/vehicleChecklistRepository.js";
import type {
  VehicleChecklistOverview,
  VehicleChecklistOverviewItem,
} from "../readModels/vehicleChecklistOverview.js";
import { checklistStyles } from "./vehicleChecklistReportStyles.js";

const e = React.createElement;
const s = checklistStyles;

/** V1-style per-vehicle checklist report (portrait A4). */
export function buildDetailedDocument(input: {
  branding?: VehicleStoreBranding | undefined;
  overview: VehicleChecklistOverview;
  scopeLabel: string;
  unitReport: boolean;
}) {
  const storeName = input.branding?.name ?? "Loja Veículos";
  const generatedAt = input.overview.generatedAt;
  const item = input.overview.items[0];

  return e(
    DocumentPdfRoot,
    {
      author: storeName,
      creator: "Loja Veículos OS",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: "Checklist do veículo",
      title: "Checklist do Veículo",
    },
    e(
      DocumentPdfPage,
      { size: "A4", style: s.page },
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
        e(Text, { style: s.title }, "Checklist do Veículo"),
        e(
          View,
          { style: { flexDirection: "row", gap: 10 } },
          e(Text, { style: s.subtitle }, storeName),
          e(Text, { style: s.subtitle }, "•"),
          e(Text, { style: s.subtitle }, formatPdfDate(generatedAt)),
        ),
      ),
      item ? renderVehicleSection(item) : null,
      item ? renderInspectionSection(item) : null,
      e(
        View,
        { style: s.section, wrap: false },
        e(Text, { style: s.sectionTitle }, "Observações Adicionais"),
        e(
          View,
          { style: s.notesBox },
          e(
            Text,
            null,
            item
              ? collectNotes(item)
              : "Nenhuma observação registrada para este veículo.",
          ),
        ),
      ),
      e(
        Text,
        { style: s.footer },
        `Documento gerado pelo sistema em ${formatPdfDateTime(generatedAt)}`,
      ),
    ),
  );
}

function renderVehicleSection(item: VehicleChecklistOverviewItem) {
  const year = [item.listing.manufactureYear, item.listing.modelYear]
    .filter(Boolean)
    .join("/");
  const rows: [string, string][] = [
    ["Veículo", item.listing.title],
    ["Ano Fabricação / Modelo", year || "-"],
    [
      "Cor / Placa",
      `${item.unit.colorName || "-"}  •  ${item.unit.plate || "-"}`,
    ],
    ["Chassi", item.unit.vin || "-"],
  ];
  return e(
    View,
    { style: s.section },
    e(Text, { style: s.sectionTitle }, "Dados do veículo"),
    e(
      View,
      { style: s.infoGrid },
      ...rows.map(([label, value], index) =>
        e(
          View,
          {
            key: label,
            style: [s.row, ...(index === rows.length - 1 ? [s.lastRow] : [])],
          },
          e(Text, { style: s.label }, label),
          e(Text, { style: s.value }, value),
        ),
      ),
    ),
  );
}

function renderInspectionSection(item: VehicleChecklistOverviewItem) {
  const percent = item.metrics.progressPercent;
  const items = item.checklists.flatMap((checklist) => checklist.items);
  return e(
    View,
    { style: s.section },
    e(
      View,
      {
        style: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12,
        },
      },
      e(
        Text,
        { style: [s.sectionTitle, { marginBottom: 0 }] },
        checklistTitle(item),
      ),
      e(Text, { style: s.completionText }, `${percent}% Concluído`),
    ),
    e(
      View,
      { style: s.progressBarContainer },
      e(View, { style: [s.progressBarFill, { width: `${percent}%` }] }),
    ),
    e(
      View,
      { style: [s.infoGrid, { backgroundColor: "#ffffff", marginTop: 12 }] },
      ...items.map((checklistItem, index) =>
        e(
          View,
          {
            key: `${checklistItem.id}-${index}`,
            style: [
              s.checklistItem,
              ...(index === items.length - 1 ? [s.lastRow] : []),
            ],
          },
          e(Text, { style: s.checklistLabel }, checklistItem.label),
          e(
            Text,
            { style: [s.statusBadge, badgeStyle(checklistItem)] },
            badgeLabel(checklistItem),
          ),
        ),
      ),
    ),
  );
}

function checklistTitle(item: VehicleChecklistOverviewItem) {
  return item.checklists[0]?.name || "Inspeção e Documentação";
}

function badgeLabel(item: VehicleChecklistItem) {
  return {
    failed: "Reprovado",
    passed: "OK",
    pending: "Pendente",
    waived: "Dispensado",
  }[item.status];
}

function badgeStyle(item: VehicleChecklistItem) {
  if (item.status === "passed") return s.statusYes;
  if (item.status === "waived") return s.statusNeutral;
  return s.statusNo;
}

function collectNotes(item: VehicleChecklistOverviewItem) {
  const notes = item.checklists
    .flatMap((checklist) => checklist.items)
    .map((checklistItem) => checklistItem.notes?.trim())
    .filter((note): note is string => Boolean(note));
  return notes.length
    ? notes.join("\n")
    : "Nenhuma observação registrada para este veículo.";
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export function unitStatusLabel(
  status: VehicleChecklistOverviewItem["unit"]["status"],
) {
  return {
    acquired: "Adquirido",
    available: "Disponível",
    delivered: "Entregue",
    inactive: "Inativo",
    in_preparation: "Em preparação",
    reserved: "Reservado",
    sold: "Vendido",
  }[status];
}
