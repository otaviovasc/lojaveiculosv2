import { renderSharedDocumentPdf } from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import { buildWorkflowPdfContent } from "./vehicleWorkflowPdfContent.js";

export async function renderWorkflowDocumentPdf(
  record: CreateVehicleDocumentRecord,
): Promise<Uint8Array> {
  const content = buildWorkflowPdfContent(record);
  const metadata = asRecord(record.metadata);
  const store = asRecord(metadata.store);
  return renderSharedDocumentPdf({
    brand: {
      contactLine: text(store.contactLine, "Documento operacional auditado"),
      logoText: "LV",
      storeDocument: optionalText(store.document),
      storeName: text(store.name, "Loja Veículos"),
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
