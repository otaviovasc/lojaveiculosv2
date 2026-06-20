import { Ban, Download, FileSearch, RefreshCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  DocumentPreview,
  DocumentVersion,
  VoidDocumentInput,
  WorkspaceDocument,
} from "./types";

export function DocumentDetailPanel({
  document,
  isBusy,
  onClose,
  onDownload,
  onPreview,
  onRegenerate,
  onVoid,
  preview,
  versions,
}: {
  document: WorkspaceDocument | null;
  isBusy: boolean;
  onClose: () => void;
  onDownload: (documentId: string, versionId?: string) => Promise<void>;
  onPreview: (documentId: string) => Promise<void>;
  onRegenerate: (documentId: string) => Promise<void>;
  onVoid: (documentId: string, input: VoidDocumentInput) => Promise<void>;
  preview: DocumentPreview | null;
  versions: DocumentVersion[];
}) {
  const [voidReason, setVoidReason] = useState("");

  useEffect(() => {
    if (document) void onPreview(document.id);
    setVoidReason("");
  }, [document?.id]);

  if (!document) return null;
  const history = operationHistory(document);

  return (
    <aside className="documents-detail-panel" aria-label="Detalhe do documento">
      <div className="documents-detail-title">
        <div>
          <strong>{document.title}</strong>
          <span>{document.kind}</span>
        </div>
        <button
          aria-label="Fechar"
          onClick={onClose}
          title="Fechar"
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="documents-detail-actions">
        <button
          disabled={isBusy}
          onClick={() => void onPreview(document.id)}
          type="button"
        >
          <FileSearch aria-hidden="true" className="size-4" />
          Preview
        </button>
        <button
          disabled={isBusy}
          onClick={() => void onDownload(document.id)}
          type="button"
        >
          <Download aria-hidden="true" className="size-4" />
          Baixar
        </button>
        <button
          disabled={isBusy || document.status === "voided"}
          onClick={() => void onRegenerate(document.id)}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-4" />
          Regenerar
        </button>
      </div>

      <label className="documents-void-reason">
        <span>Motivo do cancelamento</span>
        <textarea
          onChange={(event) => setVoidReason(event.target.value)}
          value={voidReason}
        />
      </label>
      <button
        className="documents-danger-action"
        disabled={isBusy || document.status === "voided"}
        onClick={() =>
          void onVoid(document.id, {
            ...(voidReason.trim() ? { reason: voidReason.trim() } : {}),
          })
        }
        type="button"
      >
        <Ban aria-hidden="true" className="size-4" />
        Cancelar documento
      </button>

      <div className="documents-preview">
        {(preview?.sections ?? []).map((section) => (
          <section key={section.heading}>
            <strong>{section.heading}</strong>
            {section.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="documents-history">
        <strong>Historico</strong>
        {history.length === 0 ? (
          <p>Nenhuma operacao registrada.</p>
        ) : (
          history.map((item, index) => (
            <p key={`${item.action}-${index}`}>
              {item.action} · {formatDate(item.at)}
            </p>
          ))
        )}
      </div>

      <div className="documents-version-list">
        <strong>Versoes</strong>
        {versions.length === 0 ? (
          <p>Nenhuma versao gerada.</p>
        ) : (
          versions.map((version) => (
            <button
              disabled={isBusy}
              key={version.id}
              onClick={() => void onDownload(document.id, version.id)}
              title={`Baixar versao ${version.versionNumber}`}
              type="button"
            >
              <span>v{version.versionNumber}</span>
              <span>{formatDate(version.createdAt)}</span>
              <Download aria-hidden="true" className="size-4" />
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

type OperationHistoryItem = {
  action: string;
  at: string;
};

function operationHistory(document: WorkspaceDocument): OperationHistoryItem[] {
  const value = document.metadata.operationHistory;
  if (!Array.isArray(value)) return [];
  return value.filter(isOperationHistoryItem);
}

function isOperationHistoryItem(value: unknown): value is OperationHistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.action === "string" && typeof item.at === "string";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
