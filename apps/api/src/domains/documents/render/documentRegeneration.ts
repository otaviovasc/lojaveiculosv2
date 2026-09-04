import type { LinkedDocument } from "../ports/documentRepository.js";
import { buildDocumentPreview } from "../preview/documentPreview.js";
import { renderDocumentPreviewPdf } from "./documentPreviewPdf.js";
import { renderWorkflowDocumentPdf } from "../../vehicle/documents/vehicleWorkflowPdf.js";
import type { CreateVehicleDocumentRecord } from "../../vehicle/ports/vehicleInventoryRepository.js";

export type DocumentRegenerationBlockReason =
  "document_state_unsupported" | "renderer_unavailable";

export type DocumentRegenerationCapability = {
  canRegenerate: boolean;
  reason: DocumentRegenerationBlockReason | null;
};

type DocumentRegenerationRenderer = (
  document: LinkedDocument,
) => Promise<Uint8Array>;

const metadataSummaryRenderer = "metadata-summary-pdf";
const workflowReactPdfRenderer = "react-pdf";

const regenerationRenderers = new Map<string, DocumentRegenerationRenderer>([
  [
    metadataSummaryRenderer,
    (document) => renderDocumentPreviewPdf(buildDocumentPreview(document)),
  ],
  [
    workflowReactPdfRenderer,
    (document) => renderWorkflowDocumentPdf(toVehicleDocumentRecord(document)),
  ],
]);

/** "react-pdf" is stamped by the vehicle sale/reservation workflows. */
function toVehicleDocumentRecord(
  document: LinkedDocument,
): CreateVehicleDocumentRecord {
  return {
    createdByUserId: null,
    fileName: document.fileName,
    fileSizeBytes: document.fileSizeBytes,
    kind: document.kind,
    linkRole: document.linkRole,
    metadata: document.metadata,
    mimeType: document.mimeType,
    status: document.status,
    storageKey: document.storageKey,
    storeId: document.storeId,
    targetId: document.targetId,
    targetType: "vehicle_unit",
    tenantId: document.tenantId,
    title: document.title,
  };
}

export function getDocumentRegenerationCapability(
  document: LinkedDocument,
): DocumentRegenerationCapability {
  if (document.status === "voided" || document.status === "archived") {
    return {
      canRegenerate: false,
      reason: "document_state_unsupported",
    };
  }

  return getDocumentRegenerationRenderer(document)
    ? { canRegenerate: true, reason: null }
    : { canRegenerate: false, reason: "renderer_unavailable" };
}

export function getDocumentRegenerationRenderer(
  document: LinkedDocument,
): DocumentRegenerationRenderer | undefined {
  const renderer = document.metadata.renderer;
  if (typeof renderer !== "string") return undefined;
  return regenerationRenderers.get(renderer);
}

export const documentRegenerationRendererKeys = {
  metadataSummary: metadataSummaryRenderer,
  workflowReactPdf: workflowReactPdfRenderer,
} as const;
