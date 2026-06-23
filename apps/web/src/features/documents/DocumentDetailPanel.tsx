import { Ban, Download, FileSearch, RefreshCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
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
    <aside
      className="glass-panel-branded documents-detail-panel !p-6 relative overflow-hidden"
      aria-label="Detalhe do documento"
    >
      <div className="documents-detail-title">
        <div>
          <strong>{document.title}</strong>
          <span>{document.kind}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Fechar"
          className="inline-flex size-7 items-center justify-center rounded-full border border-line bg-app-elevated text-muted hover:text-primary transition-all cursor-pointer"
          onClick={onClose}
          title="Fechar"
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </motion.button>
      </div>

      <div className="documents-detail-actions grid grid-cols-3 gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-app-elevated text-xs font-bold text-app-text hover:border-line-strong hover:bg-app-elevated/80 transition-all cursor-pointer disabled:opacity-70"
          disabled={isBusy}
          onClick={() => void onPreview(document.id)}
          type="button"
        >
          <FileSearch aria-hidden="true" className="size-3.5" />
          Preview
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-app-elevated text-xs font-bold text-app-text hover:border-line-strong hover:bg-app-elevated/80 transition-all cursor-pointer disabled:opacity-70"
          disabled={isBusy}
          onClick={() => void onDownload(document.id)}
          type="button"
        >
          <Download aria-hidden="true" className="size-3.5" />
          Baixar
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-app-elevated text-xs font-bold text-app-text hover:border-line-strong hover:bg-app-elevated/80 transition-all cursor-pointer disabled:opacity-70"
          disabled={isBusy || document.status === "voided"}
          onClick={() => void onRegenerate(document.id)}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-3.5" />
          Regenerar
        </motion.button>
      </div>

      <label className="documents-void-reason grid gap-2">
        <span>Motivo do cancelamento</span>
        <textarea
          className="min-h-20 rounded-lg border border-line bg-app px-3 py-2 text-sm font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]"
          onChange={(event) => setVoidReason(event.target.value)}
          value={voidReason}
        />
      </label>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="documents-danger-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer font-bold text-sm disabled:opacity-50"
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
      </motion.button>

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
