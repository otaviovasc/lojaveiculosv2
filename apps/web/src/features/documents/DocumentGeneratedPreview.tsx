import {
  Download,
  ExternalLink,
  FileText,
  FileWarning,
  ImageIcon,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { kindLabel, statusLabel } from "./documentLabels";
import { documentStatusTone } from "./documentsWorkspaceModel";
import type { DocumentDownload, WorkspaceDocument } from "./types";

const ArtifactViewer = lazy(() =>
  import("../../components/ui/ArtifactViewer").then((module) => ({
    default: module.ArtifactViewer,
  })),
);

export function DocumentGeneratedPreview({
  document,
  onRefresh,
  preview,
  previewError,
}: {
  document: WorkspaceDocument;
  onRefresh?: (() => void) | undefined;
  preview: DocumentDownload | null;
  previewError?: string | null;
}) {
  if (preview && supportsRichArtifactViewer()) {
    return (
      <Suspense fallback={<DocumentPreviewState document={document} loading />}>
        <ArtifactViewer
          externalUrl={preview.downloadUrl}
          expiresAt={preview.expiresAt}
          fileName={preview.fileName}
          mimeType={preview.mimeType ?? document.file.mimeType}
          onRefresh={onRefresh}
          requestHeaders={preview.contentHeaders}
          title={document.title}
          url={preview.contentUrl ?? preview.downloadUrl}
        />
      </Suspense>
    );
  }

  if (preview) {
    return (
      <article className="documents-pdf-preview-empty-state">
        <div className="documents-pdf-preview-empty-card">
          <div className="documents-pdf-preview-empty-icon-wrapper">
            <FileText aria-hidden="true" />
          </div>
          <div className="documents-pdf-preview-empty-info">
            <span className="documents-pdf-preview-empty-subtitle">
              Arquivo pronto
            </span>
            <h3 className="documents-pdf-preview-empty-title">
              {document.title}
            </h3>
          </div>
          <div className="documents-detail-actions">
            <a href={preview.downloadUrl} rel="noreferrer" target="_blank">
              <ExternalLink aria-hidden="true" />
              Abrir
            </a>
            <a download={preview.fileName} href={preview.downloadUrl}>
              <Download aria-hidden="true" />
              Baixar
            </a>
          </div>
        </div>
      </article>
    );
  }

  return (
    <DocumentPreviewState
      document={document}
      error={previewError ?? null}
      loading={!previewError}
      onRefresh={onRefresh}
    />
  );
}

function supportsRichArtifactViewer() {
  return typeof globalThis.DOMMatrix !== "undefined";
}

function DocumentPreviewState({
  document,
  error,
  loading,
  onRefresh,
}: {
  document: WorkspaceDocument;
  error?: string | null;
  loading: boolean;
  onRefresh?: (() => void) | undefined;
}) {
  const mimeType = document.file.mimeType;
  const fileName = document.file.fileName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
  const isImage =
    mimeType?.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((extension) =>
      fileName.endsWith(extension),
    );
  const Icon = isPdf ? FileText : isImage ? ImageIcon : FileWarning;

  return (
    <article className="documents-pdf-preview-empty-state">
      <div className="documents-pdf-preview-empty-card">
        <div className="documents-pdf-preview-empty-icon-wrapper">
          <Icon
            aria-hidden="true"
            className="documents-pdf-preview-empty-icon"
          />
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
            {loading ? "Preparando arquivo" : "Prévia indisponível"}
          </strong>
          <p>
            {loading
              ? "Aguarde enquanto o acesso temporário é preparado para visualização."
              : (error ?? "Baixe o arquivo original para conferir o conteúdo.")}
          </p>
          {!loading && onRefresh ? (
            <button
              className="mt-3 min-h-10 rounded-lg border border-line bg-panel px-3 text-sm font-black text-app-text"
              onClick={onRefresh}
              type="button"
            >
              Tentar prévia novamente
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
