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
  documentOrigin,
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
  versions: DocumentVersion[];
}) {
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  useEffect(() => {
    if (document) void onPreview(document.id);
  }, [document?.id]);

  useEffect(() => {
    if (!document) return;
    setIsEditingMetadata(false);
  }, [document?.id]);

  if (!document) return null;

  const vehicle = documentVehicleInfo(document);
  const isAutomatic = documentOrigin(document) === "automatic";
  const isVoided = document.status === "voided";

  return (
    <section
      aria-label="Documento aberto"
      className="documents-detail-panel documents-selected-document-panel"
    >
      <header className="documents-detail-header">
        <div>
          <span>Documento aberto</span>
          <strong>{document.title}</strong>
        </div>
        <button
          aria-label="Fechar detalhes"
          className="documents-icon-button"
          onClick={onClose}
          title="Fechar detalhes"
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>

      <div className="documents-detail-badges">
        <DocumentOriginBadge document={document} />
        <DocumentScopeBadge document={document} />
      </div>

      <section className="documents-preview-card">
        <DocumentGeneratedPreview document={document} preview={preview} />
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
        <ActionButton
          disabled={isBusy || !isAutomatic || isVoided}
          icon={<RefreshCcw aria-hidden="true" className="size-4" />}
          label="Regenerar"
          onClick={() => void onRegenerate(document.id)}
        />
      </div>

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
        <Meta label="Metadados" value={documentFileLabel(document)} />
        <Meta label="MIME" value={document.file.mimeType ?? "Indisponível"} />
        <Meta
          label="Tamanho"
          value={formatFileSizeLabel(document.file.fileSizeBytes)}
        />
        <Meta label="Criado" value={formatDateTime(document.createdAt)} />
        <Meta
          label="Enviado/emitido"
          value={formatDateTime(document.uploadedAt)}
        />
        <Meta label="Responsável" value={documentActorLabel(document)} />
        <Meta label="Processo" value={readSourceProcess(document)} />
      </dl>

      <section className="documents-linked-list">
        <strong>Vínculos</strong>
        {vehicle ? (
          <p>
            {[vehicle.plate, vehicle.label, vehicle.vin]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p>Geral</p>
        )}
      </section>

      <section className="documents-version-list">
        <strong>Versões</strong>
        {versions.length === 0 ? (
          <p>Nenhuma versão carregada.</p>
        ) : (
          versions.map((version) => (
            <button
              disabled={isBusy}
              key={version.id}
              onClick={() => void onDownload(document.id, version.id)}
              title={`Baixar versão ${version.versionNumber}`}
              type="button"
            >
              <span>v{version.versionNumber}</span>
              <span>{formatDateTime(version.createdAt)}</span>
              <span>{formatFileSizeLabel(version.file.fileSizeBytes)}</span>
              <Download aria-hidden="true" className="size-4" />
            </button>
          ))
        )}
      </section>

      <footer className="documents-detail-secondary">
        <button
          disabled={isBusy || isVoided}
          onClick={() => setIsEditingMetadata(true)}
          type="button"
        >
          <Edit3 aria-hidden="true" className="size-4" />
          Editar
        </button>
        <button onClick={() => onManageLinks(document)} type="button">
          <Link2 aria-hidden="true" className="size-4" />
          Gerenciar vínculos
        </button>
        <button
          disabled={isBusy || isVoided}
          onClick={() => onDelete(document)}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Excluir
        </button>
      </footer>
    </section>
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
