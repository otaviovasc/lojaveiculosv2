import React from "react";
import { styles } from "../../documents/render/reactPdfDocumentStyles.js";
import {
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText as Text,
  DocumentPdfView as View,
  PdfPageFooter,
  PdfPaymentsTable,
  PdfPremiumHeader,
  PdfRubricaLine,
  PdfSignatureBlocks,
  PdfVehicleCardGrid,
  formatBuyerDocument,
  formatCnpj,
  formatCurrencyCents,
  formatPdfDate,
  formatPdfDateTime,
  type PdfStyle,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import { saleContractFallbackClauses } from "./vehicleWorkflowFallbackClauses.js";
import type { WorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";

const e = React.createElement;
const bold = styles.bold;

export function createSaleContractDocument(model: WorkflowPdfModel) {
  const title = model.title || "Contrato de Compra e Venda";
  const { buyer, store } = model;
  const city = buyer.city ?? store.city ?? "Cidade não informada";
  const totalCents =
    model.finance.salePriceCents ??
    model.finance.totalAmountCents ??
    sumPayments(model);
  const footerContact = [store.instagram, store.phone, store.address]
    .filter(Boolean)
    .join("  ·  ");

  return e(
    DocumentPdfRoot,
    {
      author: store.name,
      creator: "Loja Veículos OS",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: title,
      title,
    },
    e(
      DocumentPdfPage,
      { size: "A4", style: styles.pageContract },
      e(PdfPremiumHeader, {
        store,
        subtitle: `Venda nº ${model.sale.code} | ${formatPdfDateTime(model.generatedAt)}`,
        title,
      }),
      e(PdfRubricaLine),
      e(PdfPageFooter, { contactLine: footerContact }),
      e(
        Text,
        { style: styles.preambleText },
        "Pelo presente instrumento particular de contrato de compra e venda, de um lado ",
        e(Text, { style: bold }, store.name),
        store.document
          ? `, pessoa jurídica de direito privado inscrita no CNPJ sob nº ${formatCnpj(store.document)}, com sede em ${store.address || "endereço não informado"}`
          : "",
        ", doravante denominada ",
        e(Text, { style: bold }, "VENDEDORA"),
        ";",
      ),
      e(
        Text,
        { style: styles.preambleText },
        "e, de outro lado, ",
        e(Text, { style: bold }, buyer.name),
        `, brasileiro(a), ${buyer.documentLabel}: ${formatBuyerDocument(buyer.document)}`,
        buyer.address ? `, residente e domiciliado(a) à ${buyer.address}` : "",
        buyer.city ? `, ${buyer.city}/${buyer.state || ""}` : "",
        buyer.cep ? `, CEP: ${buyer.cep}` : "",
        ", doravante denominado(a) ",
        e(Text, { style: bold }, "COMPRADOR(A)"),
        ";",
      ),
      e(
        Text,
        { style: styles.preambleText },
        "têm entre si, justo e contratado, o quanto segue, mediante as cláusulas e condições abaixo estipuladas:",
      ),
      e(Text, { style: styles.sectionTitle }, "Cláusula Primeira - Do Objeto"),
      e(PdfVehicleCardGrid, { vehicle: model.vehicle }),
      e(
        Text,
        { style: styles.sectionTitle },
        "Cláusula Segunda - Do Preço e Forma de Pagamento",
      ),
      e(
        Text,
        { style: styles.clauseText },
        "O preço total ajustado para a presente compra e venda é de ",
        e(Text, { style: bold }, formatCurrencyCents(totalCents)),
        priceBreakdown(model),
        " O comprador declara ciência de que eventuais débitos anteriores à assinatura deste contrato são de responsabilidade exclusiva do vendedor.",
      ),
      e(PdfPaymentsTable, {
        payments: model.finance.payments,
        totalCents,
      }),
      ...renderClauses(model),
      e(
        View,
        { style: { marginTop: 20 }, wrap: false },
        e(
          Text,
          {
            style: styleWith(styles.sectionTitle, {
              borderBottomWidth: 0,
              marginTop: 0,
              textAlign: "center",
            }),
          },
          "Assinaturas",
        ),
        e(
          Text,
          {
            style: {
              color: "#555555",
              fontSize: 9.5,
              marginBottom: 25,
              textAlign: "center",
              textTransform: "uppercase",
            },
          },
          `${city}, ${formatPdfDate(model.generatedAt)}`,
        ),
        e(PdfSignatureBlocks, {
          signatures: [
            { name: store.name, role: "Vendedor(a)" },
            {
              highlightText: "(Reconhecer firma)",
              name: buyer.name,
              role: "Comprador(a)",
            },
            ...model.witnesses.map((name, index) => ({
              name,
              role: `Testemunha ${index + 1}`,
            })),
          ],
        }),
      ),
    ),
  );
}

function priceBreakdown(model: WorkflowPdfModel): string {
  const { discountCents, tablePriceCents } = model.finance;
  if (tablePriceCents === undefined) return ".";
  const discount =
    discountCents ??
    Math.max(0, tablePriceCents - (model.finance.salePriceCents ?? 0));
  return `, sendo o valor de tabela de ${formatCurrencyCents(tablePriceCents)} e desconto total de ${formatCurrencyCents(discount)}.`;
}

function renderClauses(model: WorkflowPdfModel) {
  if (model.clauses.length) {
    return model.clauses.map((clause, index) =>
      e(
        View,
        { key: index, wrap: false },
        e(Text, { style: styles.clauseTitle }, `Cláusula ${index + 1}`),
        e(Text, { style: styles.clauseText }, clause),
      ),
    );
  }
  return saleContractFallbackClauses({
    foroCity: model.store.city ?? model.buyer.city ?? "[Cidade]",
    foroState: model.store.state ?? model.buyer.state ?? "[Estado]",
    transferStatusLabel: model.transfer?.statusLabel ?? "Não Informado",
  }).map((clause) =>
    e(
      View,
      { key: clause.title, wrap: false },
      e(Text, { style: styles.clauseTitle }, clause.title),
      ...clause.paragraphs.map((paragraph, index) =>
        e(Text, { key: index, style: styles.clauseText }, paragraph),
      ),
    ),
  );
}

function sumPayments(model: WorkflowPdfModel): number {
  return model.finance.payments.reduce(
    (total, payment) => total + payment.valueCents,
    0,
  );
}

function styleWith(base: PdfStyle, override: PdfStyle): PdfStyle[] {
  return [base, override];
}
