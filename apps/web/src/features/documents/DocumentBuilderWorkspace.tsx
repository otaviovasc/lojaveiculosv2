import { Copy, Eye, Lock, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { Toast } from "../../components/ui/Toast";
import type { DocumentsApi } from "./apiClient";
import { DocumentBuilderAiPanel } from "./DocumentBuilderAiPanel";
import { DocumentBuilderBlocks } from "./DocumentBuilderBlocks";
import { DocumentBuilderSidebar } from "./DocumentBuilderSidebar";
import { DocumentBuilderHeader } from "./DocumentBuilderWorkspaceChrome";
import { DocumentCreateTemplateModal } from "./DocumentCreateTemplateModal";
import { DocumentTemplatePreview } from "./DocumentTemplatePreview";
import { DocumentsSectionNavigation } from "./DocumentsSectionNavigation";
import { DocumentsDialogShell } from "./DocumentsDialogShell";
import {
  collectTemplateClauseBank,
  createDefaultDocumentBuilderDraft,
  createDocumentBuilderDraft,
  documentBuilderClauses,
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
  templates: initialTemplates,
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
  const [localTemplates, setLocalTemplates] =
    useState<readonly DocumentTemplate[]>(initialTemplates);

  useEffect(() => {
    setLocalTemplates(initialTemplates);
  }, [initialTemplates]);

  const [selectedKey, setSelectedKey] = useState<string | null>(
    localTemplates[0]?.templateKey ?? null,
  );
  const selected = useMemo(
    () =>
      localTemplates.find((template) => template.templateKey === selectedKey) ??
      localTemplates[0] ??
      null,
    [selectedKey, localTemplates],
  );
  const [draft, setDraft] = useState<DocumentBuilderDraft>(() =>
    createDocumentBuilderDraft(selected),
  );
  // Local baseline of the last persisted draft. The server may normalize
  // blocks on save, so comparing against the template prop would flip the
  // dirty flag back on after every autosave and retrigger it in a loop.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(draft),
  );
  const [saveState, setSaveState] = useState<DocumentBuilderSaveState>("idle");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAiFloatingOpen, setIsAiFloatingOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const next = createDocumentBuilderDraft(selected);
    setDraft(next);
    setSavedSnapshot(JSON.stringify(next));
    setSaveState("idle");
  }, [selected?.templateKey]);

  const isSystemLocked = selected?.mode === "locked";
  const canEdit = selected?.mode === "editable";
  const isStoreCopy = selected?.source === "store";
  const isDirty = JSON.stringify(draft) !== savedSnapshot;
  const clauses = useMemo(() => documentBuilderClauses(draft.blocks), [draft]);
  const clauseBank = useMemo(
    () => collectTemplateClauseBank(localTemplates),
    [localTemplates],
  );
  const canSave = Boolean(
    selected && canEdit && draft.title.trim() && clauses.length,
  );

  useEffect(() => {
    if (!selected || !canEdit || !isDirty || !canSave) return;
    setSaveState("dirty");
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      void saveSelectedTemplate(selected, draft, onSaveRef.current)
        .then(() => {
          setSavedSnapshot(JSON.stringify(draft));
          setSaveState("saved");
          setToastMessage("Modelo salvo com sucesso.");
        })
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [canEdit, canSave, draft, isDirty, selected]);

  const handleManualSave = () => {
    if (!selected || !canSave) return;
    setSaveState("saving");
    void saveSelectedTemplate(selected, draft, onSave)
      .then(() => {
        setSavedSnapshot(JSON.stringify(draft));
        setSaveState("saved");
        setToastMessage("Modelo salvo com sucesso.");
      })
      .catch(() => setSaveState("error"));
  };

  const handleCreateTemplate = (newTemplate: DocumentTemplate) => {
    setLocalTemplates((prev) => [newTemplate, ...prev]);
    setSelectedKey(newTemplate.templateKey);
    setDraft(createDocumentBuilderDraft(newTemplate));
    setSavedSnapshot(JSON.stringify(createDocumentBuilderDraft(newTemplate)));
    setToastMessage(`Modelo "${newTemplate.title}" criado.`);
  };

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
      mainClassName="documents-builder-main documents-builder-main-wide"
    >
      <DocumentsSectionNavigation
        activeSection="templates"
        onOpenDocuments={onClose}
        onOpenTemplates={() => undefined}
        templateCount={localTemplates.length}
      />

      <DocumentBuilderHeader
        canSave={canSave && isDirty}
        isSaving={isSaving || saveState === "saving"}
        onOpenCreateTemplate={() => setIsCreateModalOpen(true)}
        onOpenPreview={() => setIsPreviewModalOpen(true)}
        onSave={handleManualSave}
        onToggleAi={() => setIsAiFloatingOpen((prev) => !prev)}
        status={status}
        templateTitle={draft.title || selected.title}
      />

      <section className="documents-builder-layout documents-builder-layout-wide">
        <DocumentBuilderSidebar
          onOpenCreateTemplate={() => setIsCreateModalOpen(true)}
          onSelect={setSelectedKey}
          selectedTemplateKey={selected.templateKey}
          templates={localTemplates}
        />

        <main className="documents-builder-editor documents-builder-editor-wide">
          {isSystemLocked ? (
            <div className="documents-builder-locked-notice flex items-start justify-between gap-4 p-4 rounded-2xl border border-line bg-app-elevated/40">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="documents-builder-locked-notice-icon flex size-8 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 shrink-0"
                >
                  <Lock className="size-4" />
                </span>
                <div>
                  <strong className="text-sm font-black text-app-text">
                    Modelo oficial · layout fixo do sistema
                  </strong>
                  <p className="text-xs text-muted mt-0.5">
                    Este documento oficial é padronizado e gerado
                    automaticamente pelo sistema com os dados da operação. Para
                    personalizar o texto, você pode criar uma cópia editável.
                  </p>
                </div>
              </div>
              <button
                className="documents-builder-ghost-action text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer"
                onClick={() => setIsCreateModalOpen(true)}
                type="button"
              >
                <Copy className="size-3.5 text-accent-strong" />
                <span>Criar cópia editável</span>
              </button>
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
            clauseBank={clauseBank}
            isEditable={canEdit}
            onBlocksChange={(blocks) =>
              setDraft((current) => ({ ...current, blocks }))
            }
            variables={selected.availableVariables}
          />
        </main>
      </section>

      {/* Floating CTA dock: AI panel + Prévia / Salvar / Assistente actions */}
      <div className="documents-builder-floating-dock">
        {isAiFloatingOpen ? (
          <div className="mb-3 w-96 rounded-2xl border border-line bg-panel p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-blue-400" />
                <strong className="text-sm font-black text-app-text">
                  Assistente IA de Documentos
                </strong>
              </div>
              <button
                className="text-muted hover:text-app-text text-xs font-bold"
                onClick={() => setIsAiFloatingOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <DocumentBuilderAiPanel
              api={api}
              canEdit={canEdit}
              draft={draft}
              onApply={setDraft}
              selected={selected}
            />
          </div>
        ) : null}

        <div className="documents-builder-fab-row">
          <button
            className="documents-builder-fab"
            onClick={() => setIsPreviewModalOpen(true)}
            type="button"
          >
            <Eye aria-hidden="true" className="size-5" />
            <span>Prévia PDF</span>
          </button>
          <button
            className="documents-builder-fab documents-builder-fab-primary"
            disabled={!canSave || !isDirty || isSaving}
            onClick={() => {
              setSaveState("saving");
              void saveSelectedTemplate(selected, draft, onSave)
                .then(() => {
                  setSavedSnapshot(JSON.stringify(draft));
                  setSaveState("saved");
                })
                .catch(() => setSaveState("error"));
            }}
            type="button"
          >
            <Save aria-hidden="true" className="size-5" />
            <span>Salvar</span>
          </button>
          <button
            className="documents-builder-fab documents-builder-fab-primary"
            onClick={() => setIsAiFloatingOpen((prev) => !prev)}
            type="button"
          >
            <Sparkles className="size-5" />
            <span>Assistente IA</span>
          </button>
        </div>
      </div>

      {/* PDF Interactive Preview Modal */}
      {isPreviewModalOpen ? (
        <DocumentsDialogShell
          backdropClassName="documents-detail-modal-backdrop"
          className="documents-pdf-preview-dialog"
          onClose={() => setIsPreviewModalOpen(false)}
          title="Prévia do Documento em PDF"
        >
          <header className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div>
              <span className="text-xs font-black text-accent-strong uppercase tracking-wider">
                Prévia do Documento em PDF
              </span>
              <h2 className="text-xl font-black text-app-text m-0">
                {draft.title}
              </h2>
            </div>
            <button
              aria-label="Fechar prévia"
              className="documents-icon-button"
              onClick={() => setIsPreviewModalOpen(false)}
              type="button"
            >
              <X className="size-5" />
            </button>
          </header>
          <DocumentTemplatePreview
            isCustomized={selected.isCustomized || isDirty}
            kind={selected.kind}
            preview={preview}
          />
        </DocumentsDialogShell>
      ) : null}

      <DocumentCreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTemplate}
        templates={localTemplates}
      />

      {toastMessage ? (
        <Toast
          key={toastMessage}
          onDismiss={() => setToastMessage(null)}
          title={toastMessage}
          tone="success"
        />
      ) : null}
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
