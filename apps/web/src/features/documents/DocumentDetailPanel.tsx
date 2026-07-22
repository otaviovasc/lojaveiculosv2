import {
  Download,
  Edit3,
  FileSearch,
  Link2,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DocumentMetadataEditor } from "./DocumentMetadataEditor";
import { DocumentGeneratedPreview } from "./DocumentGeneratedPreview";
import { DocumentOriginBadge, DocumentScopeBadge } from "./DocumentBadges";
import {
  documentActorLabel,
  documentScopeLabel,
  documentVehicleInfo,
  formatFileSizeLabel,
} from "./documentDisplayModel";
import { kindLabel, statusLabel } from "./documentLabels";
import { documentFileLabel, formatDateTime } from "./documentsWorkspaceModel";
import type {
  DocumentDownload,
  DocumentKind,
  DocumentVersion,
  WorkspaceDocument,
} from "./types";

export function DocumentDetailPanel({
  document,
  isBusy,
  onClose,
  onDelete,
  onDownload,
  onManageLinks,
  onPreview,
  onRegenerate,
  onUpdate,
  preview,
  previewError,
  versions,
}: {
  document: WorkspaceDocument | null;
  isBusy: boolean;
  onClose: () => void;
  onDelete: (document: WorkspaceDocument) => void;
  onDownload: (documentId: string, versionId?: string) => Promise<void>;
  onManageLinks: (document: WorkspaceDocument) => void;
  onPreview: (documentId: string) => Promise<void>;
  onRegenerate: (documentId: string) => Promise<void>;
  onUpdate: (
    document: WorkspaceDocument,
    input: { kind: DocumentKind; title: string },
  ) => Promise<WorkspaceDocument | null>;
  preview: DocumentDownload | null;
  previewError: string | null;
  versions: DocumentVersion[];
}) {
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "links" | "versions">(
    "info",
  );

  useEffect(() => {
    if (document) void onPreview(document.id);
  }, [document?.id]);

  useEffect(() => {
    if (!document) return;
    setIsEditingMetadata(false);
  }, [document?.id]);

  if (!document) return null;

  const vehicle = documentVehicleInfo(document);
  const isVoided = document.status === "voided";

  return (
    <div
      className="documents-detail-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        aria-label="Documento aberto"
        className="documents-detail-panel documents-selected-document-panel documents-modal-dialog"
      >
        <header className="documents-detail-header">
          <div className="documents-detail-header-info">
            <div className="documents-detail-header-row">
              <span className="documents-detail-kicker">Documento aberto:</span>
              <h2 className="documents-detail-title">{document.title}</h2>
              <div className="documents-detail-badges-inline">
                <DocumentOriginBadge document={document} />
                <DocumentScopeBadge document={document} />
              </div>
            </div>
          </div>
          <button
            aria-label="Fechar detalhes"
            className="documents-icon-button documents-modal-close"
            onClick={onClose}
            title="Fechar detalhes"
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="documents-modal-grid">
          {/* Main Document Preview Viewer Area */}
          <div className="documents-modal-preview-column">
            <section className="documents-preview-card">
              <DocumentGeneratedPreview
                document={document}
                onRefresh={() => void onPreview(document.id)}
                preview={preview}
                previewError={previewError}
              />
            </section>
            <div className="documents-detail-actions">
              <ActionButton
                disabled={isBusy}
                icon={<FileSearch aria-hidden="true" className="size-4" />}
                label="Visualizar"
                onClick={() => void onPreview(document.id)}
              />
              <ActionButton
                disabled={isBusy}
                icon={<Download aria-hidden="true" className="size-4" />}
                label="Baixar"
                onClick={() => void onDownload(document.id)}
              />
              {document.capabilities.canRegenerate ? (
                <ActionButton
                  disabled={isBusy || isVoided}
                  icon={<RefreshCcw aria-hidden="true" className="size-4" />}
                  label="Regenerar"
                  onClick={() => void onRegenerate(document.id)}
                />
              ) : null}
            </div>
          </div>

          {/* Right Inspector & Metadata Side Column */}
          <div className="documents-modal-inspector-column">
            <div className="documents-detail-tabs-bar">
              <button
                className={`documents-detail-tab-btn ${activeTab === "info" ? "active" : ""}`}
                onClick={() => setActiveTab("info")}
                type="button"
              >
                Informações
              </button>
              <button
                className={`documents-detail-tab-btn ${activeTab === "links" ? "active" : ""}`}
                onClick={() => setActiveTab("links")}
                type="button"
              >
                Vínculos
              </button>
              <button
                className={`documents-detail-tab-btn ${activeTab === "versions" ? "active" : ""}`}
                onClick={() => setActiveTab("versions")}
                type="button"
              >
                Versões ({versions.length})
              </button>
            </div>

            <div className="documents-detail-tab-content">
              {activeTab === "info" && (
                <>
                  {isEditingMetadata ? (
                    <DocumentMetadataEditor
                      document={document}
                      isBusy={isBusy}
                      onCancel={() => setIsEditingMetadata(false)}
                      onSaved={() => setIsEditingMetadata(false)}
                      onUpdate={onUpdate}
                    />
                  ) : null}

                  <dl className="documents-detail-meta">
                    <Meta label="Escopo" value={documentScopeLabel(document)} />
                    <Meta
                      label="Unidade"
                      value={
                        vehicle
                          ? [vehicle.plate, vehicle.label, vehicle.vin]
                              .filter(Boolean)
                              .join(" · ")
                          : "Geral"
                      }
                    />
                    <Meta label="Tipo" value={kindLabel(document.kind)} />
                    <Meta label="Status" value={statusLabel(document.status)} />
                    <Meta label="Arquivo" value={document.file.fileName} />
                    <Meta
                      label="Metadados"
                      value={documentFileLabel(document)}
                    />
                    <Meta
                      label="MIME"
                      value={document.file.mimeType ?? "Indisponível"}
                    />
                    <Meta
                      label="Tamanho"
                      value={formatFileSizeLabel(document.file.fileSizeBytes)}
                    />
                    <Meta
                      label="Criado"
                      value={formatDateTime(document.createdAt)}
                    />
                    <Meta
                      label="Enviado/emitido"
                      value={formatDateTime(document.uploadedAt)}
                    />
                    <Meta
                      label="Responsável"
                      value={documentActorLabel(document)}
                    />
                    <Meta
                      label="Processo"
                      value={readSourceProcess(document)}
                    />
                  </dl>
                </>
              )}

              {activeTab === "links" && (
                <section className="documents-linked-list">
                  <strong>Vínculos do Documento</strong>
                  {vehicle ? (
                    <div className="documents-linked-vehicle-card">
                      <span className="documents-linked-plate">
                        {vehicle.plate || "S/Placa"}
                      </span>
                      <div>
                        <strong>{vehicle.label}</strong>
                        {vehicle.vin ? <p>CHASSI: {vehicle.vin}</p> : null}
                      </div>
                    </div>
                  ) : (
                    <p className="documents-linked-empty">
                      Sem vínculo específico (Documento Geral da Loja)
                    </p>
                  )}
                </section>
              )}

              {activeTab === "versions" && (
                <section className="documents-version-list">
                  <strong>Histórico de Versões</strong>
                  {versions.length === 0 ? (
                    <p className="documents-versions-empty">
                      Nenhuma versão anterior carregada.
                    </p>
                  ) : (
                    <div className="documents-versions-stack">
                      {versions.map((version) => (
                        <button
                          disabled={isBusy}
                          key={version.id}
                          onClick={() =>
                            void onDownload(document.id, version.id)
                          }
                          title={`Baixar versão ${version.versionNumber}`}
                          type="button"
                          className="documents-version-item-btn"
                        >
                          <div>
                            <strong>v{version.versionNumber}</strong>
                            <span>{formatDateTime(version.createdAt)}</span>
                          </div>
                          <span className="documents-version-size">
                            {formatFileSizeLabel(version.file.fileSizeBytes)}
                          </span>
                          <Download aria-hidden="true" className="size-4" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <footer className="documents-detail-secondary">
              <button
                disabled={isBusy || isVoided}
                onClick={() => {
                  setActiveTab("info");
                  setIsEditingMetadata(true);
                }}
                type="button"
              >
                <Edit3 aria-hidden="true" className="size-4" />
                Editar
              </button>
              <button onClick={() => onManageLinks(document)} type="button">
                <Link2 aria-hidden="true" className="size-4" />
                Vínculos
              </button>
              <button
                disabled={isBusy || isVoided}
                onClick={() => onDelete(document)}
                type="button"
                className="documents-action-delete"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Excluir
              </button>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button disabled={disabled} onClick={onClick} type="button">
      {icon}
      {label}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function readSourceProcess(document: WorkspaceDocument) {
  const value =
    document.metadata.systemProcess ??
    document.metadata.workflowName ??
    document.metadata.sourceProcess ??
    document.metadata.template;
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "Indisponível";
}
