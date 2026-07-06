import { FileText, FileWarning } from "lucide-react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { kindLabel, statusLabel } from "./documentLabels";
import { documentStatusTone } from "./documentsWorkspaceModel";
import type { DocumentDownload, WorkspaceDocument } from "./types";

export function DocumentGeneratedPreview({
  document,
  preview,
}: {
  document: WorkspaceDocument;
  preview: DocumentDownload | null;
}) {
  const isPdf = isPdfDocument(preview, document);
  const viewerUrl = preview && isPdf ? createPdfViewerUrl(preview) : null;

  if (viewerUrl) {
    return (
      <article className="documents-pdf-preview-container">
        <object
          aria-label={`Prévia PDF de ${document.title}`}
          className="documents-pdf-preview-frame"
          data={viewerUrl}
          type="application/pdf"
        >
          <iframe
            className="documents-pdf-preview-frame"
            src={viewerUrl}
            title={`Prévia PDF de ${document.title}`}
          />
        </object>
      </article>
    );
  }

  return (
    <article className="documents-pdf-preview-empty-state">
      <div className="documents-pdf-preview-empty-card">
        <div className="documents-pdf-preview-empty-icon-wrapper">
          {isPdf ? (
            <FileText
              className="documents-pdf-preview-empty-icon size-8"
              aria-hidden="true"
            />
          ) : (
            <FileWarning
              className="documents-pdf-preview-empty-icon size-8"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="documents-pdf-preview-empty-info">
          <span className="documents-pdf-preview-empty-subtitle">
            {kindLabel(document.kind)}
          </span>
          <h3 className="documents-pdf-preview-empty-title">
            {document.title}
          </h3>
          <div className="documents-pdf-preview-empty-badge-row">
            <FeatureStatusBadge tone={documentStatusTone(document.status)}>
              {statusLabel(document.status)}
            </FeatureStatusBadge>
          </div>
        </div>
        <div className="documents-pdf-preview-empty-details">
          <strong>
            {isPdf ? "Carregando PDF" : "Prévia PDF indisponível"}
          </strong>
          <p>
            {isPdf
              ? "Aguarde enquanto o arquivo emitido é assinado para visualização."
              : "Este arquivo não está no formato PDF. Faça o download para visualizar o conteúdo."}
          </p>
        </div>
      </div>
    </article>
  );
}

function isPdfDocument(
  preview: DocumentDownload | null,
  document: WorkspaceDocument,
) {
  const mimeType = preview?.mimeType ?? document.file.mimeType;
  return (
    mimeType === "application/pdf" ||
    document.file.fileName.toLocaleLowerCase("pt-BR").endsWith(".pdf")
  );
}

function createPdfViewerUrl(download: DocumentDownload) {
  if (download.downloadUrl.includes("#")) return download.downloadUrl;
  return `${download.downloadUrl}#toolbar=1&navpanes=0&view=FitH`;
}
