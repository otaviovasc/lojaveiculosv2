import { Lock, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { DocumentsApi } from "./apiClient";
import { DocumentBuilderAiPanel } from "./DocumentBuilderAiPanel";
import { DocumentBuilderBlocks } from "./DocumentBuilderBlocks";
import { DocumentBuilderSidebar } from "./DocumentBuilderSidebar";
import {
  DocumentBuilderHeader,
  DocumentBuilderInspector,
  type DocumentBuilderInspectorView,
} from "./DocumentBuilderWorkspaceChrome";
import { DocumentTemplatePreview } from "./DocumentTemplatePreview";
import { DocumentsSectionNavigation } from "./DocumentsSectionNavigation";
import { kindLabel } from "./documentLabels";
import {
  createDefaultDocumentBuilderDraft,
  createDocumentBuilderDraft,
  documentBuilderClauses,
  isDocumentBuilderDirty,
  type DocumentBuilderDraft,
  type DocumentBuilderSaveState,
  type DocumentBuilderStatus,
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
  const [inspectorView, setInspectorView] =
    useState<DocumentBuilderInspectorView>("preview");
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    setDraft(createDocumentBuilderDraft(selected));
    setSaveState("idle");
  }, [selected?.templateKey]);

  const isSystemLocked = selected?.mode === "locked";
  const canEdit = selected?.mode === "editable";
  const isStoreCopy = selected?.source === "store";
  const isDirty = isDocumentBuilderDirty(selected, draft);
  const clauses = useMemo(() => documentBuilderClauses(draft.blocks), [draft]);
  const canSave = Boolean(
    selected && canEdit && draft.title.trim() && clauses.length,
  );

  useEffect(() => {
    if (!selected || !canEdit || !isDirty || !canSave) return;
    setSaveState("dirty");
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      void saveSelectedTemplate(selected, draft, onSaveRef.current)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [canEdit, canSave, draft, isDirty, selected]);

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

  const status = builderStatus(saveState, isSaving, canEdit, isSystemLocked);

  return (
    <FeaturePageShell
      className="documents-builder-page"
      mainClassName="documents-builder-main"
    >
      <DocumentsSectionNavigation
        activeSection="templates"
        onOpenDocuments={onClose}
        onOpenTemplates={() => undefined}
        templateCount={templates.length}
      />

      <DocumentBuilderHeader
        isSaveDisabled={!canSave || !isDirty || isSaving}
        onSave={() => {
          setSaveState("saving");
          void saveSelectedTemplate(selected, draft, onSave)
            .then(() => setSaveState("saved"))
            .catch(() => setSaveState("error"));
        }}
        status={status}
      />

      <section className="documents-builder-layout">
        <DocumentBuilderSidebar
          onSelect={setSelectedKey}
          selectedTemplateKey={selected.templateKey}
          templates={templates}
        />

        <main className="documents-builder-editor">
          <header className="documents-builder-editor-head">
            <span className="documents-builder-kind-chip">
              {kindLabel(selected.kind)}
            </span>
            <p>
              {canEdit
                ? "Personalize o texto usado nas próximas emissões deste documento."
                : "Documento gerado automaticamente pelo sistema a partir dos dados da operação."}
            </p>
          </header>

          {isSystemLocked ? (
            <div className="documents-builder-locked-notice">
              <span
                aria-hidden="true"
                className="documents-builder-locked-notice-icon"
              >
                <Lock className="size-5" />
              </span>
              <div>
                <strong>Modelo oficial · somente leitura</strong>
                <p>
                  Este documento é gerado automaticamente pelo sistema com os
                  dados da operação. O layout e o conteúdo seguem um padrão fixo
                  e não podem ser editados como texto. Use a prévia ao lado para
                  conferir a estrutura.
                </p>
              </div>
            </div>
          ) : null}

          <div className="documents-builder-name-panel">
            <label className="documents-builder-name-field">
              <span>Nome do modelo</span>
              <input
                disabled={!canEdit}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Ex.: Contrato de compra e venda"
                value={draft.title}
              />
            </label>
            <button
              className="documents-builder-ghost-action"
              disabled={!canEdit}
              onClick={() =>
                setDraft(createDefaultDocumentBuilderDraft(selected))
              }
              title={
                isStoreCopy
                  ? "Restaurar o texto do modelo oficial"
                  : "Restaurar o texto padrão"
              }
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {isStoreCopy ? "Restaurar oficial" : "Restaurar padrão"}
            </button>
          </div>

          <DocumentBuilderBlocks
            blocks={draft.blocks}
            isEditable={canEdit}
            onBlocksChange={(blocks) =>
              setDraft((current) => ({ ...current, blocks }))
            }
            variables={selected.availableVariables}
          />
        </main>

        <DocumentBuilderInspector
          assistant={
            <DocumentBuilderAiPanel
              api={api}
              canEdit={canEdit}
              draft={draft}
              onApply={setDraft}
              selected={selected}
            />
          }
          onViewChange={setInspectorView}
          preview={
            <DocumentTemplatePreview
              isCustomized={selected.isCustomized || isDirty}
              kind={selected.kind}
              preview={preview}
            />
          }
          view={inspectorView}
        />
      </section>
    </FeaturePageShell>
  );
}

function builderStatus(
  state: DocumentBuilderSaveState,
  isSaving: boolean,
  canEdit: boolean,
  isSystemLocked: boolean,
): DocumentBuilderStatus {
  if (isSystemLocked && !canEdit) {
    return { label: "Somente leitura", tone: "locked" };
  }
  if (isSaving || state === "saving")
    return { label: "Salvando…", tone: "saving" };
  if (state === "dirty")
    return { label: "Alterações não salvas", tone: "dirty" };
  if (state === "error") return { label: "Erro ao salvar", tone: "error" };
  if (state === "saved") return { label: "Tudo salvo", tone: "saved" };
  return { label: "Sem alterações", tone: "idle" };
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
