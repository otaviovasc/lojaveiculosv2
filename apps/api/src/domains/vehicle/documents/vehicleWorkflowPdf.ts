import { renderSharedDocumentPdf } from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import { buildWorkflowPdfContent } from "./vehicleWorkflowPdfContent.js";

export async function renderWorkflowDocumentPdf(
  record: CreateVehicleDocumentRecord,
): Promise<Uint8Array> {
  const content = buildWorkflowPdfContent(record);
  return renderSharedDocumentPdf({
    brand: {
      contactLine: "Documento gerado pelo fluxo operacional",
      logoText: "LV",
      storeName: "Loja Veiculos",
    },
    clauses: content.clauses,
    fields: [content.buyer, content.vehicle, content.finance],
    audit: content.audit,
    intro: content.intro,
    signatures: ["Loja / vendedor", "Comprador"],
    subtitle: content.subtitle,
    title: content.title,
  });
}
