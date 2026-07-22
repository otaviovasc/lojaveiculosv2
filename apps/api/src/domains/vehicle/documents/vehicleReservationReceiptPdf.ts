import React from "react";
import {
  createDocumentPdfStyles,
  styles,
} from "../../documents/render/reactPdfDocumentStyles.js";
import {
  DocumentPdfImage as Image,
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText as Text,
  DocumentPdfView as View,
  PdfFieldRow,
  formatBuyerDocument,
  formatCnpj,
  formatCurrencyCents,
  formatPdfDate,
  formatPdfDateTime,
  formatPhoneForPdf,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import { reservationFallbackDeclarations } from "./vehicleWorkflowFallbackClauses.js";
import type { WorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";

const e = React.createElement;

const reservationStyles = createDocumentPdfStyles({
  rule: { borderTopColor: "#000000", borderTopWidth: 0.75 },
  header: { alignItems: "center", paddingBottom: 7, paddingTop: 6 },
  logoWrap: { alignItems: "center", marginBottom: 4 },
  logo: { maxHeight: 70, maxWidth: 92, objectFit: "contain" },
  title: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  storeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingTop: 8,
  },
  storeLeft: { width: "55%" },
  storeRight: { alignItems: "flex-end", width: "42%" },
  storeText: { fontSize: 8.5, marginBottom: 2 },
  paragraph: { fontSize: 9, lineHeight: 1.45, marginBottom: 18 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  declarationTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 30,
  },
  declaration: { fontSize: 8.8, lineHeight: 1.35, marginBottom: 9 },
  observationTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 18,
    marginTop: 18,
    textTransform: "uppercase",
  },
  dateLine: { fontSize: 8.5, marginTop: 20, textAlign: "right" },
  agreement: { fontSize: 8, marginBottom: 36, marginTop: 8 },
  signatures: { flexDirection: "row", gap: 4, justifyContent: "space-between" },
  signature: { alignItems: "center", width: "49%" },
  signatureLine: {
    borderTopColor: "#000000",
    borderTopWidth: 0.5,
    marginBottom: 5,
    width: "100%",
  },
  signatureLabel: { fontSize: 8, textAlign: "center" },
});

export function createReservationReceiptDocument(model: WorkflowPdfModel) {
  const { buyer, store, vehicle } = model;
  const declarations = model.clauses.length
    ? model.clauses
    : reservationFallbackDeclarations({
        expiresAt: model.reservationExpiresAt,
      });
  const issueDateTime = formatPdfDateTime(model.generatedAt);
  const location = [store.city, store.state].filter(Boolean).join(" - ");
  const vehicleName = (
    [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ") ||
    vehicle.title ||
    "Veículo"
  ).toUpperCase();

  return e(
    DocumentPdfRoot,
    {
      author: store.name,
      creator: "Loja Veículos OS",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: model.title,
      title: model.title,
    },
    e(
      DocumentPdfPage,
      { size: "A4", style: styles.pageReservation },
      e(View, { style: reservationStyles.rule }),
      e(
        View,
        { style: reservationStyles.header },
        store.logoUrl
          ? e(
              View,
              { style: reservationStyles.logoWrap },
              e(Image, {
                src: store.logoUrl,
                style: reservationStyles.logo,
              }),
            )
          : null,
        e(
          Text,
          { style: reservationStyles.title },
          "Recibo de Sinal de Reserva de Veículo",
        ),
      ),
      e(View, { style: reservationStyles.rule }),
      e(
        View,
        { style: reservationStyles.storeRow },
        e(
          View,
          { style: reservationStyles.storeLeft },
          e(Text, { style: reservationStyles.storeText }, store.name),
          store.address
            ? e(Text, { style: reservationStyles.storeText }, store.address)
            : null,
        ),
        e(
          View,
          { style: reservationStyles.storeRight },
          store.document
            ? e(
                Text,
                { style: reservationStyles.storeText },
                `CNPJ: ${formatCnpj(store.document)}`,
              )
            : null,
          store.phone
            ? e(
                Text,
                { style: reservationStyles.storeText },
                `TELEFONE: ${formatPhoneForPdf(store.phone)}`,
              )
            : null,
        ),
      ),
      e(
        Text,
        { style: reservationStyles.paragraph },
        "Recebemos de ",
        e(Text, { style: styles.bold }, buyer.name),
        `, inscrito no ${buyer.documentLabel} sob o n. ${formatBuyerDocument(buyer.document) || "---"}, a importancia de `,
        e(
          Text,
          { style: styles.bold },
          formatCurrencyCents(model.finance.signalAmountCents ?? 0),
        ),
        " como pagamento pela reserva do veiculo abaixo descrito:",
      ),
      e(
        View,
        null,
        e(Text, { style: reservationStyles.sectionTitle }, "Dados do Veículo"),
        e(PdfFieldRow, {
          fields: [{ label: "VEÍCULO", value: vehicleName }],
        }),
        e(PdfFieldRow, {
          fields: [
            { label: "RENAVAM", value: vehicle.renavam ?? "N/A" },
            { label: "PLACA", value: vehicle.plate ?? "N/A" },
            {
              flex: 0.75,
              label: "ANO",
              value: `${vehicle.manufactureYear ?? "----"}/${vehicle.modelYear ?? "----"}`,
            },
          ],
        }),
        e(PdfFieldRow, {
          fields: [
            { flex: 0.55, label: "KM", value: String(vehicle.km ?? "0") },
            { flex: 1.7, label: "CHASSI", value: vehicle.chassi ?? "N/A" },
            { label: "COR", value: vehicle.color ?? "N/A" },
          ],
        }),
      ),
      e(Text, { style: reservationStyles.declarationTitle }, "Declaração:"),
      ...declarations.map((declaration, index) =>
        e(
          Text,
          { key: index, style: reservationStyles.declaration },
          declaration,
        ),
      ),
      e(Text, { style: reservationStyles.observationTitle }, "Observação"),
      model.notes
        ? e(Text, { style: reservationStyles.declaration }, model.notes)
        : null,
      e(
        Text,
        { style: reservationStyles.dateLine },
        `${location || "[Cidade]"}, ${formatPdfDate(model.generatedAt)} ${issueDateTime.split(", ")[1] || ""}`,
      ),
      e(Text, { style: reservationStyles.agreement }, "De Acordo:"),
      e(
        View,
        { style: reservationStyles.signatures },
        ...[store.name, buyer.name].map((label) =>
          e(
            View,
            { key: label, style: reservationStyles.signature },
            e(View, { style: reservationStyles.signatureLine }),
            e(Text, { style: reservationStyles.signatureLabel }, label),
          ),
        ),
      ),
    ),
  );
}
