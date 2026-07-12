import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { DocumentsApi } from "./apiClient";
import { DocumentBuilderAiPanel } from "./DocumentBuilderAiPanel";
import { DocumentBuilderBlocks } from "./DocumentBuilderBlocks";
import { DocumentBuilderSidebar } from "./DocumentBuilderSidebar";
import { DocumentTemplatePreview } from "./DocumentTemplatePreview";
import { kindLabel } from "./documentLabels";
import {
  createDefaultDocumentBuilderDraft,
  createDocumentBuilderDraft,
  documentBuilderClauses,
  isDocumentBuilderDirty,
  type DocumentBuilderDraft,
  type DocumentBuilderSaveState,
} from "./documentBuilderModel";
import { renderDocumentTemplatePreview } from "./documentTemplatePreviewModel";
import type { DocumentTemplate, UpdateDocumentTemplateInput } from "./types";

export function DocumentBuilderWorkspace({
  api,
  isSaving,
  onClose,
  onSave,
  templates,
}: {
  api: DocumentsApi | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (
    templateKey: string,
    input: UpdateDocumentTemplateInput,
  ) => Promise<void>;
  templates: readonly DocumentTemplate[];
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(
    templates[0]?.templateKey ?? null,
  );
  const selected = useMemo(
    () =>
      templates.find((template) => template.templateKey === selectedKey) ??
      templates[0] ??
      null,
    [selectedKey, templates],
  );
  const [draft, setDraft] = useState<DocumentBuilderDraft>(() =>
    createDocumentBuilderDraft(selected),
  );
  const [saveState, setSaveState] = useState<DocumentBuilderSaveState>("idle");
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    setDraft(createDocumentBuilderDraft(selected));
    setSaveState("idle");
  }, [selected?.templateKey]);

  const isEditable = selected?.mode === "editable";
  const isDirty = isDocumentBuilderDirty(selected, draft);
  const clauses = useMemo(() => documentBuilderClauses(draft.blocks), [draft]);
  const canSave = Boolean(
    selected && isEditable && draft.title.trim() && clauses.length,
  );

  useEffect(() => {
    if (!selected || !isEditable || !isDirty || !canSave) return;
    setSaveState("dirty");
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      void saveSelectedTemplate(selected, draft, onSaveRef.current)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [canSave, draft, isDirty, isEditable, selected]);

  if (!selected) {
    return (
      <FeaturePageShell className="documents-builder-page">
        <FeatureAlert title="Nenhum modelo disponível" tone="warning">
          <p>Os modelos ainda não foram carregados.</p>
        </FeatureAlert>
      </FeaturePageShell>
    );
  }

  const preview = renderDocumentTemplatePreview(
    { clauses, title: draft.title },
    selected.kind,
    selected.context,
  );

  return (
    <FeaturePageShell
      className="documents-builder-page"
      mainClassName="documents-builder-main"
    >
      <header className="documents-builder-topbar">
        <button
          aria-label="Voltar para documentos"
          className="documents-builder-back"
          onClick={onClose}
          title="Voltar para documentos"
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
        <div>
          <span>Document builder</span>
          <h1>{selected.title}</h1>
          <p>{selected.description}</p>
        </div>
        <div className="documents-builder-save-status">
          <div className="documents-builder-status-wrapper">
            <span
              className={`documents-builder-status-dot documents-builder-status-dot--${saveState} ${
                isSaving ? "documents-builder-status-dot--saving" : ""
              }`}
              aria-hidden="true"
            />
            <span className="documents-builder-status-text">
              {saveStatusLabel(saveState, isSaving, selected.mode)}
            </span>
          </div>
          <button
            disabled={!canSave || !isDirty || isSaving}
            onClick={() => {
              setSaveState("saving");
              void saveSelectedTemplate(selected, draft, onSave)
                .then(() => setSaveState("saved"))
                .catch(() => setSaveState("error"));
            }}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            Salvar
          </button>
        </div>
      </header>

      <section className="documents-builder-layout">
        <DocumentBuilderSidebar
          onSelect={setSelectedKey}
          selectedTemplateKey={selected.templateKey}
          templates={templates}
        />

        <main className="documents-builder-editor">
          <section className="documents-builder-title-panel">
            <div>
              <span>{kindLabel(selected.kind)}</span>
              <strong>{selected.templateKey}</strong>
            </div>
            <input
              disabled={!isEditable}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              value={draft.title}
            />
            <button
              disabled={!isEditable}
              onClick={() =>
                setDraft(createDefaultDocumentBuilderDraft(selected))
              }
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Restaurar padrão
            </button>
          </section>

          <DocumentBuilderBlocks
            blocks={draft.blocks}
            isEditable={isEditable}
            onBlocksChange={(blocks) =>
              setDraft((current) => ({ ...current, blocks }))
            }
            variables={selected.availableVariables}
          />
        </main>

        <aside className="documents-builder-inspector">
          <DocumentBuilderAiPanel
            api={api}
            draft={draft}
            onApply={setDraft}
            selected={selected}
          />
          <DocumentTemplatePreview
            isCustomized={selected.isCustomized || isDirty}
            kind={selected.kind}
            preview={preview}
          />
        </aside>
      </section>
    </FeaturePageShell>
  );
}

function saveStatusLabel(
  state: DocumentBuilderSaveState,
  isSaving: boolean,
  mode: DocumentTemplate["mode"],
) {
  if (mode === "locked") return "Renderizador travado";
  if (isSaving || state === "saving") return "Salvando";
  if (state === "dirty") return "Alterações não salvas";
  if (state === "error") return "Erro ao salvar";
  if (state === "saved") return "Salvo";
  return "Sem alterações";
}

function saveSelectedTemplate(
  template: DocumentTemplate,
  draft: DocumentBuilderDraft,
  onSave: (
    templateKey: string,
    input: UpdateDocumentTemplateInput,
  ) => Promise<void>,
) {
  return onSave(template.templateKey, {
    blocks: draft.blocks,
    clauses: documentBuilderClauses(draft.blocks),
    title: draft.title.trim(),
  });
}
