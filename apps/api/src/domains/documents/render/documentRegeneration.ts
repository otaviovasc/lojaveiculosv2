import type { LinkedDocument } from "../ports/documentRepository.js";
import { buildDocumentPreview } from "../preview/documentPreview.js";
import { renderDocumentPreviewPdf } from "./documentPreviewPdf.js";

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

const regenerationRenderers = new Map<string, DocumentRegenerationRenderer>([
  [
    metadataSummaryRenderer,
    (document) => renderDocumentPreviewPdf(buildDocumentPreview(document)),
  ],
]);

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
} as const;
