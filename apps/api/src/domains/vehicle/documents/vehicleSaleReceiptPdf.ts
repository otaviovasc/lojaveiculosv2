import React from "react";
import { styles } from "../../documents/render/reactPdfDocumentStyles.js";
import {
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText as Text,
  DocumentPdfView as View,
  PdfDensePaymentsTable,
  PdfFieldRow,
  PdfLogo,
  formatBuyerDocument,
  formatCnpj,
  formatCurrencyCents,
  formatPdfDate,
  formatPdfDateTime,
  formatPhoneForPdf,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import { receiptStyles } from "./vehicleSaleReceiptPdfStyles.js";
import { renderReceiptTransferSection } from "./vehicleSaleReceiptPdfSections.js";
import type { WorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";

const e = React.createElement;

export function createSaleReceiptDocument(model: WorkflowPdfModel) {
  const { buyer, store, vehicle } = model;
  const dateTime = formatPdfDateTime(model.generatedAt);
  const time = dateTime.split(", ")[1] || "---";
  const totalCents = model.finance.salePriceCents ?? sumPayments(model);
  const vehicleName =
    [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ") ||
    vehicle.title ||
    "-";

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
      { size: "A4", style: styles.pageForm },
      e(
        View,
        { style: receiptStyles.titleHeader },
        e(
          Text,
          { style: receiptStyles.mainTitle },
          `RECIBO DE VENDA Nº ${model.sale.code}`,
        ),
      ),
      e(
        View,
        { fixed: true, style: receiptStyles.header },
        e(
          View,
          { style: receiptStyles.headerTop },
          e(PdfLogo, { src: store.logoUrl }),
        ),
        e(
          View,
          { style: receiptStyles.headerBottom },
          e(
            View,
            { style: receiptStyles.storeInfo },
            e(Text, { style: receiptStyles.storeName }, store.name),
            store.address
              ? e(Text, { style: receiptStyles.storeDetail }, store.address)
              : null,
            store.document
              ? e(
                  Text,
                  { style: receiptStyles.storeDetail },
                  `CNPJ: ${formatCnpj(store.document)}`,
                )
              : null,
            store.phone
              ? e(
                  Text,
                  { style: receiptStyles.storeDetail },
                  `Tel: ${formatPhoneForPdf(store.phone)}`,
                )
              : null,
          ),
          e(
            View,
            { style: receiptStyles.headerRightDetails },
            headerDetail("DATA DA VENDA:", formatPdfDate(model.generatedAt)),
            headerDetail("HORA DA VENDA:", time),
            headerDetail("CÓDIGO DO PEDIDO:", model.sale.code),
            headerDetail("VENDEDOR:", model.sellerName ?? "N/A"),
          ),
        ),
      ),
      e(
        View,
        { style: receiptStyles.section },
        e(Text, { style: styles.formSectionHeader }, "DADOS DO CLIENTE"),
        e(PdfFieldRow, {
          fields: [
            { flex: 2, label: "NOME", value: buyer.name },
            {
              flex: 1,
              label: buyer.documentLabel,
              value: formatBuyerDocument(buyer.document) || "N/A",
            },
          ],
        }),
        e(PdfFieldRow, {
          fields: [{ label: "ENDEREÇO", value: buyer.address ?? "N/A" }],
        }),
        e(PdfFieldRow, {
          fields: [
            { flex: 1, label: "BAIRRO", value: buyer.district ?? "N/A" },
            {
              flex: 1.5,
              label: "CIDADE",
              value:
                [buyer.city, buyer.state].filter(Boolean).join(" / ") || "N/A",
            },
            { flex: 0.8, label: "CEP", value: buyer.cep ?? "N/A" },
          ],
        }),
        e(PdfFieldRow, {
          fields: [
            { label: "TELEFONE 1", value: buyer.phone ?? "N/A" },
            { label: "TELEFONE 2", value: buyer.phone2 ?? "N/A" },
            { label: "TELEFONE 3", value: buyer.phone3 ?? "N/A" },
          ],
        }),
        e(PdfFieldRow, {
          fields: [{ label: "EMAIL", value: buyer.email ?? "N/A" }],
        }),
      ),
      e(
        View,
        { style: receiptStyles.section },
        e(Text, { style: styles.formSectionHeader }, "DADOS DO VEÍCULO"),
        e(PdfFieldRow, {
          fields: [{ label: "VEÍCULO", value: vehicleName }],
        }),
        e(PdfFieldRow, {
          fields: [
            { label: "RENAVAM", value: vehicle.renavam ?? "N/A" },
            { label: "PLACA", value: vehicle.plate ?? "N/A" },
            {
              label: "ANO",
              value: `${vehicle.manufactureYear ?? "----"}/${vehicle.modelYear ?? "----"}`,
            },
          ],
        }),
        e(PdfFieldRow, {
          fields: [
            { flex: 0.8, label: "KM", value: String(vehicle.km ?? "N/A") },
            { flex: 1.5, label: "CHASSI", value: vehicle.chassi ?? "N/A" },
            { label: "COR", value: vehicle.color ?? "N/A" },
          ],
        }),
      ),
      e(
        View,
        { style: receiptStyles.section },
        e(Text, { style: styles.formSectionHeader }, "CONDIÇÕES DE PAGAMENTO"),
        e(PdfFieldRow, {
          fields: [
            {
              label: "PREÇO DE TABELA",
              value: formatCurrencyCents(
                model.finance.tablePriceCents ?? totalCents,
              ),
            },
            {
              label: "DESCONTO",
              value: formatCurrencyCents(model.finance.discountCents ?? 0),
            },
            { label: "PREÇO DE VENDA", value: formatCurrencyCents(totalCents) },
          ],
        }),
        e(PdfDensePaymentsTable, {
          payments: model.finance.payments,
          totalCents,
        }),
      ),
      model.notes
        ? e(
            View,
            { style: receiptStyles.obsBox },
            e(
              Text,
              null,
              e(Text, { style: styles.bold }, "OBS: "),
              model.notes,
            ),
          )
        : null,
      renderReceiptTransferSection(model),
      e(
        Text,
        { style: receiptStyles.dateLocation },
        `${buyer.city ?? store.city ?? "[Cidade]"}, ${formatPdfDate(model.generatedAt)} ${time}`,
      ),
      e(
        View,
        { style: receiptStyles.signatureSection },
        ...[store.name, "VENDEDOR", "CLIENTE"].map((label) =>
          e(
            View,
            { key: label, style: receiptStyles.signatureItem },
            e(View, { style: receiptStyles.signatureLine }),
            e(Text, { style: receiptStyles.signatureLabel }, label),
          ),
        ),
      ),
    ),
  );
}

function headerDetail(label: string, value: string) {
  return e(
    View,
    { key: label, style: receiptStyles.headerDetailRow },
    e(Text, { style: receiptStyles.headerDetailLabel }, label),
    e(Text, { style: receiptStyles.headerDetailValue }, value),
  );
}

function sumPayments(model: WorkflowPdfModel): number {
  return model.finance.payments.reduce(
    (total, payment) => total + payment.valueCents,
    0,
  );
}
