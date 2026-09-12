import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { formStyles } from "./reactPdfFormStyles.js";
import { styles } from "./reactPdfDocumentStyles.js";
import {
  formatCurrencyCents,
  paymentMethodLabel,
} from "./reactPdfFormatHelpers.js";
import type { PdfPaymentRow, PdfStyle } from "./reactPdfDocumentPrimitives.js";

const e = React.createElement;
const t = { ...styles, ...formStyles };

/** Premium payments table (slate header, total row). */
export function PdfPaymentsTable({
  payments,
  totalCents,
}: {
  payments: readonly PdfPaymentRow[];
  totalCents: number | null | undefined;
}) {
  return e(
    View,
    { style: t.paymentTable, wrap: false },
    e(
      View,
      { style: t.paymentHeader },
      e(Text, { style: [t.paymentHeaderText, { width: "30%" }] }, "Forma"),
      e(Text, { style: [t.paymentHeaderText, { width: "40%" }] }, "Descrição"),
      e(Text, { style: [t.paymentHeaderText, { width: "15%" }] }, "Data"),
      e(
        Text,
        {
          style: [t.paymentHeaderText, { textAlign: "right", width: "15%" }],
        },
        "Valor",
      ),
    ),
    ...payments.map((payment, index) =>
      e(
        View,
        { key: index, style: t.paymentRow },
        e(
          View,
          { style: t.paymentColMethod },
          e(Text, { style: t.paymentText }, paymentMethodLabel(payment.method)),
        ),
        e(
          View,
          { style: t.paymentColDesc },
          e(Text, { style: t.paymentText }, payment.description ?? "-"),
        ),
        e(
          View,
          { style: t.paymentColDate },
          e(Text, { style: t.paymentText }, payment.date ?? ""),
        ),
        e(
          View,
          { style: t.paymentColValue },
          e(
            Text,
            { style: t.paymentValueText },
            formatCurrencyCents(payment.valueCents),
          ),
        ),
      ),
    ),
    e(
      View,
      { style: t.paymentTotalRow },
      e(Text, { style: t.paymentTotalLabel }, "TOTAL:"),
      e(Text, { style: t.paymentTotalValue }, formatCurrencyCents(totalCents)),
    ),
  );
}

/** Dense bordered payments table used by the sale receipt. */
export function PdfDensePaymentsTable({
  payments,
  totalCents,
}: {
  payments: readonly PdfPaymentRow[];
  totalCents: number | null | undefined;
}) {
  const widths = ["25%", "45%", "15%", "15%"] as const;
  const header = ["FORMA PAGAMENTO", "DESCRIÇÃO", "DATA", "VALOR"];
  return e(
    View,
    { style: t.formTable },
    e(
      View,
      { style: t.formTableHeader },
      ...header.map((label, index) =>
        e(
          Text,
          {
            key: label,
            style: [
              index === header.length - 1 ? t.formTableColLast : t.formTableCol,
              {
                fontWeight: "bold",
                textAlign:
                  index >= 2 ? (index === 3 ? "right" : "center") : "left",
                width: widths[index],
              } as PdfStyle,
            ],
          },
          label,
        ),
      ),
    ),
    ...payments.map((payment, index) =>
      e(
        View,
        { key: index, style: t.formTableRow },
        e(
          Text,
          { style: [t.formTableCol, { width: widths[0] }] },
          paymentMethodLabel(payment.method).toUpperCase(),
        ),
        e(
          Text,
          { style: [t.formTableCol, { width: widths[1] }] },
          payment.description ?? "-",
        ),
        e(
          Text,
          {
            style: [t.formTableCol, { textAlign: "center", width: widths[2] }],
          },
          payment.date ?? "",
        ),
        e(
          Text,
          {
            style: [
              t.formTableColLast,
              { textAlign: "right", width: widths[3] },
            ],
          },
          formatCurrencyCents(payment.valueCents),
        ),
      ),
    ),
    e(
      View,
      { style: t.formTableTotalRow },
      e(Text, { style: t.formTableTotalLabel }, "TOTAL:"),
      e(
        Text,
        { style: t.formTableTotalValue },
        formatCurrencyCents(totalCents),
      ),
    ),
  );
}
