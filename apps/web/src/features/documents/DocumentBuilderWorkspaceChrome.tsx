import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FilePenLine,
  Loader2,
  Lock,
  Pencil,
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
  isSaveDisabled,
  onSave,
  saveLabel = "Salvar",
  status,
}: {
  isSaveDisabled: boolean;
  onSave: () => void;
  saveLabel?: string;
  status: DocumentBuilderStatus;
}) {
  const StatusIcon = statusIcon[status.tone];
  return (
    <header className="documents-builder-topbar">
      <div className="documents-builder-heading">
        <span className="documents-builder-heading-icon">
          <FilePenLine aria-hidden="true" className="size-5" />
        </span>
        <div>
          <span>Configuração da loja</span>
          <h1>Modelos de documentos</h1>
          <p>Edite os textos usados nos documentos emitidos pela operação.</p>
        </div>
      </div>

      <div className="documents-builder-save-status">
        <span className="documents-builder-status-pill" data-tone={status.tone}>
          <StatusIcon
            aria-hidden="true"
            className={
              status.tone === "saving" ? "size-3.5 animate-spin" : "size-3.5"
            }
          />
          {status.label}
        </span>
        <button disabled={isSaveDisabled} onClick={onSave} type="button">
          <Save aria-hidden="true" className="size-4" />
          {saveLabel}
        </button>
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
