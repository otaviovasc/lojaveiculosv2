import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FilePenLine,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { DocumentBuilderStatus } from "./documentBuilderModel";

export type DocumentBuilderInspectorView = "assistant" | "preview";

const statusIcon: Record<
  DocumentBuilderStatus["tone"],
  ComponentType<{ className?: string }>
> = {
  dirty: Pencil,
  error: AlertTriangle,
  idle: CheckCircle2,
  locked: Lock,
  saved: CheckCircle2,
  saving: Loader2,
};

export function DocumentBuilderHeader({
  canSave,
  isSaving,
  onOpenCreateTemplate,
  onOpenPreview,
  onSave,
  onToggleAi,
  status,
  templateTitle,
}: {
  canSave?: boolean;
  isSaving?: boolean;
  onOpenCreateTemplate?: () => void;
  onOpenPreview?: () => void;
  onSave?: () => void;
  onToggleAi?: () => void;
  status: DocumentBuilderStatus;
  templateTitle?: string;
}) {
  const StatusIcon = statusIcon[status.tone];
  return (
    <header className="documents-builder-topbar sticky top-0 z-30 shadow-lg backdrop-blur-md bg-panel/95 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-line">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-strong shrink-0">
          <FilePenLine aria-hidden="true" className="size-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-app-text m-0 truncate">
              {templateTitle || "Modelos de documentos"}
            </h1>
            <span
              className="documents-builder-status-pill shrink-0"
              data-tone={status.tone}
            >
              <StatusIcon
                aria-hidden="true"
                className={
                  status.tone === "saving"
                    ? "size-3.5 animate-spin"
                    : "size-3.5"
                }
              />
              {status.label}
            </span>
          </div>
          <p className="text-xs font-semibold text-muted m-0 truncate">
            Editor de modelos e cláusulas para emissão de contratos e recibos
          </p>
        </div>
      </div>

      <div className="documents-builder-topbar-actions flex items-center gap-2 shrink-0">
        {onOpenCreateTemplate ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-app px-3 py-1.5 text-xs font-bold text-app-text transition hover:bg-app-elevated hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            onClick={onOpenCreateTemplate}
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5 text-accent-strong" />
            <span>Novo modelo</span>
          </button>
        ) : null}

        {onOpenPreview ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-app px-3 py-1.5 text-xs font-bold text-app-text transition hover:bg-app-elevated hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            onClick={onOpenPreview}
            type="button"
          >
            <Eye aria-hidden="true" className="size-3.5 text-muted" />
            <span>Prévia PDF</span>
          </button>
        ) : null}

        {onToggleAi ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-app px-3 py-1.5 text-xs font-bold text-app-text transition hover:bg-app-elevated hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            onClick={onToggleAi}
            type="button"
          >
            <Sparkles
              aria-hidden="true"
              className="size-3.5 text-accent-strong"
            />
            <span>Assistente IA</span>
          </button>
        ) : null}

        {onSave ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition hover:bg-accent-strong hover:text-accent-strong-foreground disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            disabled={!canSave || isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-3.5" />
            )}
            <span>Salvar</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function DocumentBuilderInspector({
  assistant,
  onViewChange,
  preview,
  view,
}: {
  assistant: ReactNode;
  onViewChange: (view: DocumentBuilderInspectorView) => void;
  preview: ReactNode;
  view: DocumentBuilderInspectorView;
}) {
  return (
    <aside
      aria-label="Ferramentas do modelo"
      className="documents-builder-inspector"
    >
      <div
        aria-label="Ferramentas do modelo"
        className="documents-builder-inspector-tabs"
        role="tablist"
      >
        <button
          aria-controls="documents-builder-preview-panel"
          aria-selected={view === "preview"}
          id="documents-builder-preview-tab"
          onClick={() => onViewChange("preview")}
          role="tab"
          type="button"
        >
          <Eye aria-hidden="true" className="size-4" />
          Prévia
        </button>
        <button
          aria-controls="documents-builder-assistant-panel"
          aria-selected={view === "assistant"}
          id="documents-builder-assistant-tab"
          onClick={() => onViewChange("assistant")}
          role="tab"
          type="button"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Assistente
        </button>
      </div>

      <div
        aria-labelledby="documents-builder-preview-tab"
        hidden={view !== "preview"}
        id="documents-builder-preview-panel"
        role="tabpanel"
      >
        {preview}
      </div>
      <div
        aria-labelledby="documents-builder-assistant-tab"
        hidden={view !== "assistant"}
        id="documents-builder-assistant-panel"
        role="tabpanel"
      >
        {assistant}
      </div>
    </aside>
  );
}
