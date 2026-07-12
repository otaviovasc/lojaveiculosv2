import { createHash } from "node:crypto";
import { renderSeedDocumentPdf } from "./seed-product-document-pdf.mjs";

export async function createSeedDocumentArtifact(document) {
  const body = await renderSeedDocumentPdf(document);
  return {
    body,
    sha256: sha256SeedDocumentBytes(body),
  };
}

export function sha256SeedDocumentBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
