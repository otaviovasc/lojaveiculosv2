import { useCallback, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { CrmActionDialogShell } from "./CrmActionDialogFrame";
import { TagEditorDrawer } from "./CrmTagEditorDrawer";
import { TagManagerHeader } from "./CrmTagManagerHeader";
import type {
  CrmCreateTagInput,
  CrmReorderTagsInput,
  CrmTag,
  CrmUpdateTagInput,
} from "./crmConversationTypes";
import {
  getTagStatusMessage,
  TagAdminRow,
  type TagDraft,
  TagDeleteConfirm,
  type PendingTagAction,
  runPendingTagAction,
  toCreateTagInput,
  toUpdateTagInput,
} from "./CrmTagManagerParts";

const emptyDraft: TagDraft = { color: "", emoji: "", name: "" };

export function CrmTagManager({
  disabled,
  embedded = false,
  onClose,
  onCreate,
  onDelete,
  onReorder,
  onUpdate,
  tags,
}: {
  disabled?: boolean;
  embedded?: boolean;
  onClose: () => void;
  onCreate: (input: CrmCreateTagInput) => Promise<boolean>;
  onDelete: (tagId: string) => Promise<boolean>;
  onReorder: (input: CrmReorderTagsInput) => Promise<boolean>;
  onUpdate: (tagId: string, input: CrmUpdateTagInput) => Promise<boolean>;
  tags: CrmTag[];
}) {
  const [draft, setDraft] = useState<TagDraft>(emptyDraft);
  const [editing, setEditing] = useState<CrmTag | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingTagAction>(null);
  const [tagToDelete, setTagToDelete] = useState<CrmTag | null>(null);
  const hasPendingAction = Boolean(pendingAction) || isSaving;
  const canSave = Boolean(draft.name.trim()) && !hasPendingAction && !disabled;
  const statusMessage = getTagStatusMessage({
    editing: Boolean(editing),
    isSaving,
    pendingAction,
    tagToDelete,
  });

  const closeEditor = useCallback(() => {
    if (isSaving) return;
    setDraft(emptyDraft);
    setEditing(null);
    setEditorOpen(false);
    setLocalError(null);
  }, [isSaving]);

  const startCreate = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setLocalError(null);
    setEditorOpen(true);
  };

  const editTag = (tag: CrmTag) => {
    setEditing(tag);
    setDraft({
      color: tag.color ?? "",
      emoji: tag.emoji ?? "",
      name: tag.name,
    });
    setLocalError(null);
    setEditorOpen(true);
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setLocalError(null);
    try {
      const accepted = editing
        ? await onUpdate(editing.id, toUpdateTagInput(draft))
        : await onCreate(toCreateTagInput(draft));
      if (accepted) closeEditor();
      else setLocalError("Nao foi possivel salvar a etiqueta.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTag = async () => {
    if (!tagToDelete || disabled || hasPendingAction) return;
    await runPendingTagAction({
      action: { kind: "delete", tagId: tagToDelete.id },
      failureMessage: "Nao foi possivel excluir a etiqueta.",
      onAccepted: () => setTagToDelete(null),
      operation: () => onDelete(tagToDelete.id),
      setLocalError,
      setPendingAction,
    });
  };

  const moveTag = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (
      disabled ||
      hasPendingAction ||
      targetIndex < 0 ||
      targetIndex >= tags.length
    ) {
      return;
    }
    const tagIds = tags.map((tag) => tag.id);
    const currentTagId = tagIds[index];
    const targetTagId = tagIds[targetIndex];
    if (!currentTagId || !targetTagId) return;
    tagIds[index] = targetTagId;
    tagIds[targetIndex] = currentTagId;
    await runPendingTagAction({
      action: { kind: "move", tagId: currentTagId },
      failureMessage: "Nao foi possivel reordenar etiquetas.",
      operation: () => onReorder({ tagIds }),
      setLocalError,
      setPendingAction,
    });
  };

  const listContent = (
    <>
      <TagManagerHeader
        disabled={Boolean(disabled) || hasPendingAction}
        embedded={embedded}
        onClose={onClose}
        onCreate={startCreate}
        tagCount={tags.length}
      />
      <div className="crm-tag-list-surface">
        <div className="crm-tag-list-heading">
          <div>
            <strong>Ordem de exibicao</strong>
            <p>As etiquetas aparecem nesta sequencia durante o atendimento.</p>
          </div>
        </div>
        {disabled ? (
          <p className="crm-tag-manager-note">
            Seu usuario pode visualizar, mas nao pode alterar etiquetas.
          </p>
        ) : null}
        {localError && !editorOpen ? (
          <p className="crm-tag-manager-error">{localError}</p>
        ) : null}
        {statusMessage && !editorOpen ? (
          <p aria-live="polite" className="crm-tag-manager-status">
            {statusMessage}
          </p>
        ) : null}
        <div className="crm-tag-admin-list">
          {tags.length ? (
            tags.map((tag, index) => (
              <TagAdminRow
                disabled={Boolean(disabled) || hasPendingAction}
                index={index}
                key={tag.id}
                onDelete={setTagToDelete}
                onEdit={editTag}
                onMove={(nextIndex, direction) =>
                  void moveTag(nextIndex, direction)
                }
                pendingAction={pendingAction}
                tag={tag}
                tagsLength={tags.length}
              />
            ))
          ) : (
            <div className="crm-tag-empty-card">
              <span aria-hidden="true" className="crm-tag-empty-icon">
                <Tags />
              </span>
              <p className="crm-tag-manager-empty">Nenhuma etiqueta criada.</p>
              <p className="crm-tag-empty-description">
                Crie etiquetas personalizadas com cores e emojis para
                classificar suas conversas e organizar o fluxo da sua equipe.
              </p>
              <button
                className="crm-action crm-tag-create-btn"
                disabled={Boolean(disabled) || hasPendingAction}
                onClick={startCreate}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                <span>Criar primeira etiqueta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
  const overlays = (
    <>
      <TagEditorDrawer
        canSave={canSave}
        disabled={Boolean(disabled)}
        draft={draft}
        editing={editing}
        error={localError}
        isOpen={editorOpen}
        isSaving={isSaving}
        onChange={setDraft}
        onClose={closeEditor}
        onSave={() => void save()}
        statusMessage={statusMessage}
      />

      {tagToDelete ? (
        <TagDeleteConfirm
          disabled={Boolean(disabled) || Boolean(pendingAction)}
          onCancel={() => setTagToDelete(null)}
          onConfirm={() => void deleteTag()}
          tag={tagToDelete}
        />
      ) : null}
    </>
  );

  if (!embedded) {
    return (
      <CrmActionDialogShell
        onClose={onClose}
        panelClassName="crm-tag-manager"
        title="Etiquetas"
      >
        {listContent}
        {overlays}
      </CrmActionDialogShell>
    );
  }

  return (
    <section aria-label="Etiquetas" className="crm-tag-manager-page">
      <div className="crm-tag-manager">{listContent}</div>
      {overlays}
    </section>
  );
}
