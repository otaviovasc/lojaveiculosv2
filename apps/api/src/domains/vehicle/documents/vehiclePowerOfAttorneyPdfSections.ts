import React from "react";
import { styles } from "../../documents/render/reactPdfDocumentStyles.js";
import {
  DocumentPdfText as Text,
  DocumentPdfView as View,
  formatPdfDate,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import { procuracaoStyles } from "./vehicleProcuracaoPdfStyles.js";
import type { WorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";

const e = React.createElement;

/** Location/date line, buyer signature line and the yellow legal notices. */
export function renderProcuracaoSignatureSection(
  model: WorkflowPdfModel,
  location: string,
) {
  return e(
    View,
    { style: procuracaoStyles.signatureSection },
    e(
      Text,
      { style: procuracaoStyles.paragraph },
      `${location || "[Cidade] – [Estado]"}, ${formatPdfDate(model.generatedAt)}`,
    ),
    e(
      View,
      { style: { alignItems: "center", marginTop: 25 } },
      e(Text, { style: procuracaoStyles.signatureNameAbove }, model.buyer.name),
      e(View, { style: procuracaoStyles.signatureLine }),
      e(
        Text,
        { style: procuracaoStyles.signatureText },
        "____________________________________",
      ),
      e(
        View,
        { style: [styles.highlight, { marginTop: 6 }] },
        e(
          Text,
          { style: [procuracaoStyles.signatureText, styles.bold] },
          "(Reconhecer firma por autenticidade)",
        ),
      ),
    ),
    e(
      View,
      { style: [styles.highlight, { marginTop: 30, padding: 5 }] },
      e(
        Text,
        {
          style: [
            procuracaoStyles.signatureText,
            styles.bold,
            { textAlign: "left" },
          ],
        },
        "* Anexar Cópia da CNH e Comprovante de Endereço",
      ),
    ),
  );
}
