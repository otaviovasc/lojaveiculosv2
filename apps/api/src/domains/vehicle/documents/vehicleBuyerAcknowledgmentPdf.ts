import React from "react";
import {
  createDocumentPdfStyles,
  styles,
} from "../../documents/render/reactPdfDocumentStyles.js";
import {
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText as Text,
  DocumentPdfView as View,
  PdfLogo,
  formatBuyerDocument,
  formatCnpj,
  formatPdfDateTime,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { WorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";

const e = React.createElement;

export const BUYER_ACKNOWLEDGMENT_ITEMS = [
  "Procuração para transferência",
  "CRV / ATPV-e / Documento de Transferência",
  "Contrato de Compra e Venda",
  "Manual do Proprietário",
  "Chave Reserva",
  "Chave Principal",
  "Vistoria",
  "Recibo de Pagamento",
  "Outros:",
] as const;

const acknowledgmentStyles = createDocumentPdfStyles({
  titleWrapper: {
    borderBottomWidth: 0.5,
    borderColor: "#000000",
    borderTopWidth: 0.5,
    marginBottom: 30,
    paddingVertical: 5,
    width: "100%",
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  text: { fontSize: 10, marginBottom: 15, textAlign: "justify" },
  itemsTitle: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 10,
  },
  itemsList: { marginBottom: 20 },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8,
  },
  checkbox: {
    borderColor: "#000000",
    borderWidth: 1,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  itemLabel: { color: "#000000", fontSize: 10 },
  itemFill: {
    borderBottomColor: "#000000",
    borderBottomWidth: 0.5,
    flex: 1,
    marginLeft: 6,
  },
  dateLocation: {
    fontSize: 10,
    marginBottom: 10,
    marginTop: 40,
    textAlign: "right",
  },
  deAcordo: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 50,
    marginTop: 20,
  },
  signatures: {
    flexDirection: "row",
    gap: 40,
    justifyContent: "space-between",
    marginTop: 10,
  },
  signatureLine: {
    borderTopColor: "#000000",
    borderTopWidth: 0.5,
    fontSize: 9,
    fontWeight: "bold",
    paddingTop: 8,
    textAlign: "center",
    width: "48%",
  },
});

export function createBuyerAcknowledgmentDocument(model: WorkflowPdfModel) {
  const { buyer, store, vehicle } = model;

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
      { size: "A4", style: styles.pageTerm },
      e(PdfLogo, { src: store.logoUrl }),
      e(
        View,
        { style: acknowledgmentStyles.titleWrapper },
        e(
          Text,
          { style: acknowledgmentStyles.title },
          "TERMO DE RECEBIMENTO DE DOCUMENTOS E ITENS",
        ),
      ),
      e(
        Text,
        { style: acknowledgmentStyles.text },
        "Eu, ",
        e(Text, { style: styles.bold }, buyer.name),
        `, inscrita(o) no ${buyer.documentLabel} sob No. `,
        e(Text, { style: styles.bold }, formatBuyerDocument(buyer.document)),
        ", DECLARO para os devidos fins que recebi de ",
        e(Text, { style: styles.bold }, store.name),
        store.document
          ? `, inscrita sob o CNPJ ${formatCnpj(store.document)}`
          : "",
        ", os documentos e itens abaixo relacionados, referentes ao veículo ",
        e(Text, { style: styles.bold }, vehicle.title ?? "-"),
        `, placa ${vehicle.plate ?? "N/A"}, ano ${vehicle.manufactureYear ?? "----"}/${vehicle.modelYear ?? "----"}.`,
      ),
      e(
        Text,
        { style: acknowledgmentStyles.itemsTitle },
        "Documentos e Itens Recebidos:",
      ),
      e(
        View,
        { style: acknowledgmentStyles.itemsList },
        ...BUYER_ACKNOWLEDGMENT_ITEMS.map((item) => acknowledgmentItem(item)),
      ),
      e(
        Text,
        { style: acknowledgmentStyles.text },
        "Por ser expressão da verdade, firmo o presente termo de recebimento.",
      ),
      e(
        View,
        { style: acknowledgmentStyles.dateLocation },
        e(
          Text,
          null,
          `${buyer.city ?? store.city ?? "[Cidade]"}, ${formatPdfDateTime(model.generatedAt)}`,
        ),
      ),
      e(Text, { style: acknowledgmentStyles.deAcordo }, "De Acordo:"),
      e(
        View,
        { style: acknowledgmentStyles.signatures },
        e(
          View,
          { style: acknowledgmentStyles.signatureLine },
          e(Text, null, store.name),
        ),
        e(
          View,
          { style: acknowledgmentStyles.signatureLine },
          e(Text, null, buyer.name),
        ),
      ),
    ),
  );
}

function acknowledgmentItem(label: string) {
  return e(
    View,
    { key: label, style: acknowledgmentStyles.itemRow },
    e(View, { style: acknowledgmentStyles.checkbox }),
    e(Text, { style: acknowledgmentStyles.itemLabel }, label),
    label === "Outros:"
      ? e(View, { style: acknowledgmentStyles.itemFill })
      : null,
  );
}
