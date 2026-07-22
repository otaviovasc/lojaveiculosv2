import React from "react";
import { styles } from "../../documents/render/reactPdfDocumentStyles.js";
import {
  DocumentPdfText as Text,
  DocumentPdfView as View,
  PdfFieldRow,
  formatCurrencyCents,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import { receiptStyles } from "./vehicleSaleReceiptPdfStyles.js";
import type { WorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";

const e = React.createElement;

/** TRANSFERÊNCIA DE PROPRIEDADE block; omitted when no transfer data exists. */
export function renderReceiptTransferSection(model: WorkflowPdfModel) {
  return model.transfer
    ? e(
        View,
        { style: [receiptStyles.section, receiptStyles.transferBox] },
        e(
          Text,
          { style: styles.formSectionHeader },
          "TRANSFERÊNCIA DE PROPRIEDADE",
        ),
        e(PdfFieldRow, {
          fields: [
            {
              flex: 2,
              label: "SITUAÇÃO",
              value: model.transfer.statusLabel ?? "Não Informado",
            },
            {
              flex: 1,
              label: "VALOR",
              value: formatCurrencyCents(model.transfer.valueCents ?? 0),
            },
          ],
        }),
        e(PdfFieldRow, {
          fields: [
            {
              flex: 2,
              label: "NOME CRV",
              value: model.transfer.crvName ?? "-",
            },
            { flex: 1, label: "CPF CRV", value: model.transfer.crvCpf ?? "-" },
          ],
        }),
      )
    : null;
}
