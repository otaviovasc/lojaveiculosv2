import { PDFDocument, StandardFonts } from "pdf-lib";
import { drawSeedDocumentBody } from "./seed-product-document-pdf-body.mjs";
import {
  drawSeedDocumentFooter,
  drawSeedDocumentHeader,
} from "./seed-product-document-pdf-chrome.mjs";
import { buildSeedDocumentContent } from "./seed-product-document-pdf-content.mjs";

const A4 = [595.28, 841.89];
const FIXED_PDF_DATE = new Date("2026-07-11T12:00:00.000Z");
export const SEED_DOCUMENT_ARTIFACT_VERSION = "branded-a4-v2";

export async function renderSeedDocumentPdf(document) {
  const content = buildSeedDocumentContent(document);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const fonts = {
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    regular: await pdf.embedFont(StandardFonts.Helvetica),
  };

  applyMetadata(pdf, content);
  drawSeedDocumentHeader(page, fonts, content);
  drawSeedDocumentBody(page, fonts, content);
  drawSeedDocumentFooter(page, fonts, content);

  return pdf.save({ objectsPerTick: Number.POSITIVE_INFINITY });
}

export function shouldRefreshSeedDocumentArtifact(
  metadata,
  { expectedSha256 = "", storageKey = "" } = {},
) {
  const values = metadata && typeof metadata === "object" ? metadata : {};
  const isOwnedFixture =
    values.fixture === "local-product-seed" ||
    isOwnedSeedDocumentStorageKey(storageKey);
  if (!isOwnedFixture) return false;
  const version = values.artifactversion ?? values.artifactVersion;
  if (version !== SEED_DOCUMENT_ARTIFACT_VERSION) return true;
  if (!expectedSha256) return false;
  const storedSha256 = values.artifactsha256 ?? values.artifactSha256;
  return storedSha256 !== expectedSha256;
}

export function isOwnedSeedDocumentStorageKey(storageKey) {
  return (
    storageKey.startsWith("seed/documents/") ||
    storageKey.startsWith("generated/vehicle-workflows/")
  );
}

function applyMetadata(pdf, content) {
  pdf.setAuthor(content.storeName);
  pdf.setCreationDate(FIXED_PDF_DATE);
  pdf.setCreator("Loja Veículos OS");
  pdf.setKeywords(["loja veículos", "documento automotivo", "demonstração"]);
  pdf.setModificationDate(FIXED_PDF_DATE);
  pdf.setProducer("Loja Veículos OS");
  pdf.setSubject("Documento automotivo demonstrativo");
  pdf.setTitle(content.title);
}
