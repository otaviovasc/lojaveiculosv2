import { Eye, FilePenLine, Save, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type DocumentBuilderInspectorView = "assistant" | "preview";

export function DocumentBuilderHeader({
  isSaveDisabled,
  onSave,
  saveStatus,
}: {
  isSaveDisabled: boolean;
  onSave: () => void;
  saveStatus: string;
}) {
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
        <span className="documents-builder-status-text">{saveStatus}</span>
        <button disabled={isSaveDisabled} onClick={onSave} type="button">
          <Save aria-hidden="true" className="size-4" />
          Salvar
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
      </div>

      <div
        aria-labelledby="documents-builder-assistant-tab"
        hidden={view !== "assistant"}
        id="documents-builder-assistant-panel"
        role="tabpanel"
      >
        {assistant}
      </div>
      <div
        aria-labelledby="documents-builder-preview-tab"
        hidden={view !== "preview"}
        id="documents-builder-preview-panel"
        role="tabpanel"
      >
        {preview}
      </div>
    </aside>
  );
}
