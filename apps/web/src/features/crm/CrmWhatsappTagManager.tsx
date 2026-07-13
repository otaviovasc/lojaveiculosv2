import { useCallback, useState } from "react";
import { CrmWhatsappActionDialogShell } from "./CrmWhatsappActionDialogFrame";
import { TagEditorDrawer } from "./CrmWhatsappTagEditorDrawer";
import { TagManagerHeader } from "./CrmWhatsappTagManagerHeader";
import type {
  CrmWhatsappCreateTagInput,
  CrmWhatsappReorderTagsInput,
  CrmWhatsappTag,
  CrmWhatsappUpdateTagInput,
} from "./crmWhatsappTypes";
import {
  getTagStatusMessage,
  TagAdminRow,
  type TagDraft,
  TagDeleteConfirm,
  type PendingTagAction,
  runPendingTagAction,
  toCreateTagInput,
  toUpdateTagInput,
} from "./CrmWhatsappTagManagerParts";

const emptyDraft: TagDraft = { color: "", emoji: "", name: "" };

export function CrmWhatsappTagManager({
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
  onCreate: (input: CrmWhatsappCreateTagInput) => Promise<boolean>;
  onDelete: (tagId: string) => Promise<boolean>;
  onReorder: (input: CrmWhatsappReorderTagsInput) => Promise<boolean>;
  onUpdate: (
    tagId: string,
    input: CrmWhatsappUpdateTagInput,
  ) => Promise<boolean>;
  tags: CrmWhatsappTag[];
}) {
  const [draft, setDraft] = useState<TagDraft>(emptyDraft);
  const [editing, setEditing] = useState<CrmWhatsappTag | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingTagAction>(null);
  const [tagToDelete, setTagToDelete] = useState<CrmWhatsappTag | null>(null);
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

  const editTag = (tag: CrmWhatsappTag) => {
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
      <div className="crm-whatsapp-tag-list-surface">
        <div className="crm-whatsapp-tag-list-heading">
          <div>
            <strong>Ordem de exibicao</strong>
            <p>As etiquetas aparecem nesta sequencia durante o atendimento.</p>
          </div>
        </div>
        {disabled ? (
          <p className="crm-whatsapp-tag-manager-note">
            Seu usuario pode visualizar, mas nao pode alterar etiquetas.
          </p>
        ) : null}
        {localError && !editorOpen ? (
          <p className="crm-whatsapp-tag-manager-error">{localError}</p>
        ) : null}
        {statusMessage && !editorOpen ? (
          <p aria-live="polite" className="crm-whatsapp-tag-manager-status">
            {statusMessage}
          </p>
        ) : null}
        <div className="crm-whatsapp-tag-admin-list">
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
            <p className="crm-whatsapp-tag-manager-empty">
              Nenhuma etiqueta criada.
            </p>
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
      <CrmWhatsappActionDialogShell
        onClose={onClose}
        panelClassName="crm-whatsapp-tag-manager"
        title="Etiquetas WhatsApp"
      >
        {listContent}
        {overlays}
      </CrmWhatsappActionDialogShell>
    );
  }

  return (
    <section
      aria-label="Etiquetas WhatsApp"
      className="crm-whatsapp-tag-manager-page"
    >
      <div className="crm-whatsapp-tag-manager">{listContent}</div>
      {overlays}
    </section>
  );
}
