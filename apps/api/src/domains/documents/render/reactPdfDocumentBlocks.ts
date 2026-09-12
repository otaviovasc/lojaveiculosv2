import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { formStyles } from "./reactPdfFormStyles.js";
import { styles } from "./reactPdfDocumentStyles.js";
import type {
  PdfSignatureInfo,
  PdfStyle,
  PdfVehicleInfo,
} from "./reactPdfDocumentPrimitives.js";

const e = React.createElement;
const t = { ...styles, ...formStyles };

export function PdfHighlightText({ children }: { children: React.ReactNode }) {
  return e(
    View,
    { style: styles.highlight },
    e(
      Text,
      { style: [styles.signatureRole, { color: "#000", fontWeight: "bold" }] },
      children,
    ),
  );
}

function vehicleCardField(label: string, value: string, width: PdfStyle) {
  return e(
    View,
    { key: label, style: [t.vehicleField, width] },
    e(Text, { style: t.cardFieldLabel }, label),
    e(Text, { style: t.cardFieldValue }, value),
  );
}

/** V1-style vehicle card grid (#f8fafc cards on #e2e8f0 borders). */
export function PdfVehicleCardGrid({ vehicle }: { vehicle: PdfVehicleInfo }) {
  const text = (value: unknown, fallback: string) =>
    value === null || value === undefined || value === ""
      ? fallback
      : String(value);
  const year =
    vehicle.manufactureYear || vehicle.modelYear
      ? `${vehicle.manufactureYear ?? "----"}/${vehicle.modelYear ?? "----"}`
      : "Não informado";
  return e(
    View,
    { style: t.vehicleGrid, wrap: false },
    vehicleCardField(
      "Marca / Modelo",
      text(
        [vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
          vehicle.title,
        "Não informado",
      ),
      t.vehicleFieldHalf,
    ),
    vehicleCardField(
      "Versão",
      text(vehicle.version, "Não informado"),
      t.vehicleFieldHalf,
    ),
    vehicleCardField("Ano Fabricação / Modelo", year, t.vehicleFieldThird),
    vehicleCardField(
      "Cor",
      text(vehicle.color, "Não informada"),
      t.vehicleFieldThird,
    ),
    vehicleCardField(
      "Combustível",
      text(vehicle.fuel, "Não informado"),
      t.vehicleFieldThird,
    ),
    vehicleCardField(
      "Placa",
      text(vehicle.plate, "XX-XXXX"),
      t.vehicleFieldThird,
    ),
    vehicleCardField(
      "Renavam",
      text(vehicle.renavam, "XXXXXXXXXX"),
      t.vehicleFieldThird,
    ),
    vehicleCardField(
      "Quilometragem",
      `${text(vehicle.km, "0")} km`,
      t.vehicleFieldThird,
    ),
    vehicleCardField(
      "Laudo Cautelar",
      text(vehicle.laudo, "Não informado"),
      t.vehicleFieldFull,
    ),
  );
}

/** Underlined `LABEL: value` form rows (receipts, terms, reservation). */
export function PdfFieldRow({
  fields,
}: {
  fields: readonly {
    flex?: number | undefined;
    label: string;
    value: string;
  }[];
}) {
  return e(
    View,
    { style: t.fieldRow },
    ...fields.map((field) =>
      e(
        View,
        {
          key: field.label,
          style: [t.field, { flex: field.flex ?? 1 }],
        },
        e(Text, { style: t.fieldLabel }, `${field.label}:`),
        e(Text, { style: t.fieldValue }, field.value),
      ),
    ),
  );
}

/** Signature line blocks (line + name + optional highlight + role), 2 per row. */
export function PdfSignatureBlocks({
  signatures,
}: {
  signatures: readonly PdfSignatureInfo[];
}) {
  const rows: PdfSignatureInfo[][] = [];
  for (let index = 0; index < signatures.length; index += 2) {
    rows.push(signatures.slice(index, index + 2));
  }
  return e(
    View,
    null,
    ...rows.map((row, rowIndex) =>
      e(
        View,
        {
          key: rowIndex,
          style: [
            t.signaturesRow,
            ...(rowIndex > 0 ? [{ marginTop: 60 }] : []),
          ],
        },
        ...row.map((signature) =>
          e(
            View,
            { key: signature.name, style: t.signatureBox },
            e(View, { style: t.signatureLine }),
            e(Text, { style: t.signatureName }, signature.name),
            signature.highlightText
              ? e(PdfHighlightText, null, signature.highlightText)
              : null,
            signature.role
              ? e(Text, { style: t.signatureRole }, signature.role)
              : null,
          ),
        ),
        ...(row.length === 1 ? [e(View, { style: t.signatureBox })] : []),
      ),
    ),
  );
}
