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

const termStyles = createDocumentPdfStyles({
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
  sectionTitle: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 15,
  },
  vehicleGrid: { marginBottom: 20 },
  fieldRow: { flexDirection: "row", gap: 15, marginBottom: 5 },
  field: {
    alignItems: "flex-end",
    borderBottomColor: "#000000",
    borderBottomWidth: 0.5,
    flexDirection: "row",
    paddingBottom: 2,
  },
  label: { color: "#000000", fontSize: 9, marginRight: 5 },
  value: { color: "#000000", flex: 1, fontSize: 10, fontWeight: "bold" },
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

export function createDeliveryTermDocument(model: WorkflowPdfModel) {
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
        { style: termStyles.titleWrapper },
        e(Text, { style: termStyles.title }, "TERMO DE ENTREGA DE VEÍCULO"),
      ),
      e(
        Text,
        { style: termStyles.text },
        "Pelo presente termo de responsabilidade de venda de veículo, a ",
        e(Text, { style: styles.bold }, store.name),
        store.document
          ? `, inscrito sob o CNPJ ${formatCnpj(store.document)}`
          : "",
        ", ora denominado ",
        e(Text, { style: styles.bold }, "VENDEDOR"),
        ", DECLARO a quem possa interessar, que nesta data, entrego o veículo especificado abaixo, a ",
        e(Text, { style: styles.bold }, buyer.name),
        `, inscrita(o) no ${buyer.documentLabel} sob No. `,
        e(Text, { style: styles.bold }, formatBuyerDocument(buyer.document)),
        ", ora denominada ",
        e(Text, { style: styles.bold }, "COMPRADORA"),
        ", veículo este, livre e desembaraçado de quaisquer ônus, quer judiciais ou extrajudiciais, respondendo ainda por qualquer evento que venha futuramente a ocorrer com referência ao veículo em período retroativo a esta data.",
      ),
      e(Text, { style: termStyles.sectionTitle }, "Dados do Veículo:"),
      e(
        View,
        { style: termStyles.vehicleGrid },
        e(
          View,
          { style: termStyles.fieldRow },
          termField(1, "Marca:", vehicle.brand ?? "-"),
          termField(1.2, "Modelo:", vehicle.model ?? "-"),
          termField(
            1,
            "Ano:",
            `${vehicle.manufactureYear ?? "----"}/${vehicle.modelYear ?? "----"}`,
          ),
        ),
        e(
          View,
          { style: termStyles.fieldRow },
          termField(3, "Versão:", vehicle.version ?? "N/A"),
          termField(1, "KM:", String(vehicle.km ?? "N/A")),
        ),
        e(
          View,
          { style: termStyles.fieldRow },
          termField(1.5, "Renavam:", vehicle.renavam ?? "N/A"),
          termField(1, "Placa:", vehicle.plate ?? "N/A"),
          termField(0.8, "Cor:", vehicle.color ?? "N/A"),
        ),
      ),
      ...renderBodyParagraphs(model),
      e(
        View,
        { style: termStyles.dateLocation },
        e(
          Text,
          null,
          `${buyer.city ?? store.city ?? "[Cidade]"}, ${formatPdfDateTime(model.generatedAt)}`,
        ),
      ),
      e(Text, { style: termStyles.deAcordo }, "De Acordo:"),
      e(
        View,
        { style: termStyles.signatures },
        e(View, { style: termStyles.signatureLine }, e(Text, null, store.name)),
        e(View, { style: termStyles.signatureLine }, e(Text, null, buyer.name)),
      ),
    ),
  );
}

function renderBodyParagraphs(model: WorkflowPdfModel) {
  if (model.clauses.length) {
    return model.clauses.map((clause, index) =>
      e(Text, { key: index, style: termStyles.text }, clause),
    );
  }
  return [
    e(
      Text,
      { key: "responsibility", style: termStyles.text },
      "O ",
      e(Text, { style: styles.bold }, "COMPRADOR"),
      " assume a responsabilidade civil e criminal pela aquisição do veículo abaixo descrito, bem como pelas multas de trânsito e IPVA que vierem a ser cobrados a partir ",
      e(Text, { style: styles.bold }, "desta data"),
      ", isentando totalmente o VENDEDOR contra Danos Materiais e Pessoais causados a terceiros ou qualquer tipo de ação movida que envolva o referido veículo.",
    ),
    e(
      Text,
      { key: "effects", style: termStyles.text },
      "Para que surta seus efeitos legais firmo o presente termo de responsabilidade:",
    ),
  ];
}

function termField(flex: number, label: string, value: string) {
  return e(
    View,
    { key: label, style: [termStyles.field, { flex }] },
    e(Text, { style: termStyles.label }, label),
    e(Text, { style: termStyles.value }, value),
  );
}
