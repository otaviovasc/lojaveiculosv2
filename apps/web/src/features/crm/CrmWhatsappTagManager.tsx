import { Plus, Save, Tag, X } from "lucide-react";
import { useState } from "react";
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
  TagDraftFields,
  TagDeleteConfirm,
  type PendingTagAction,
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

  const reset = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setLocalError(null);
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setLocalError(null);
    try {
      const accepted = editing
        ? await onUpdate(editing.id, toUpdateTagInput(draft))
        : await onCreate(toCreateTagInput(draft));
      if (accepted) reset();
      else setLocalError("Nao foi possivel salvar a etiqueta.");
    } finally {
      setIsSaving(false);
    }
  };

  const editTag = (tag: CrmWhatsappTag) => {
    setEditing(tag);
    setDraft({
      color: tag.color ?? "",
      emoji: tag.emoji ?? "",
      name: tag.name,
    });
    setLocalError(null);
  };

  const deleteTag = async () => {
    if (!tagToDelete || disabled || hasPendingAction) return;
    setPendingAction({ kind: "delete", tagId: tagToDelete.id });
    setLocalError(null);
    try {
      const accepted = await onDelete(tagToDelete.id);
      if (!accepted) setLocalError("Nao foi possivel excluir a etiqueta.");
      if (accepted && editing?.id === tagToDelete.id) reset();
      if (accepted) setTagToDelete(null);
    } finally {
      setPendingAction(null);
    }
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
    setPendingAction({ kind: "move", tagId: currentTagId });
    setLocalError(null);
    try {
      const accepted = await onReorder({ tagIds });
      if (!accepted) setLocalError("Nao foi possivel reordenar etiquetas.");
    } finally {
      setPendingAction(null);
    }
  };

  const panel = (
    <div className="crm-whatsapp-action-panel crm-whatsapp-tag-manager">
      <header>
        <span>
          <Tag />
        </span>
        <h2>Etiquetas</h2>
        {embedded ? null : (
          <button
            aria-label="Fechar"
            className="crm-icon-action"
            onClick={onClose}
            type="button"
          >
            <X />
          </button>
        )}
      </header>
      <div className="crm-whatsapp-action-fields">
        <TagDraftFields
          disabled={disabled || isSaving}
          draft={draft}
          onChange={setDraft}
        />
        <p className="crm-whatsapp-tag-manager-note">
          Etiquetas sao labels simples para organizar conversas no WhatsApp. Use
          para marcar prioridade, origem ou proxima acao.
        </p>
        {localError ? (
          <p className="crm-whatsapp-tag-manager-error">{localError}</p>
        ) : null}
        {statusMessage ? (
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
      <footer>
        {editing ? (
          <button
            className="crm-action crm-action-muted"
            onClick={reset}
            type="button"
          >
            Nova
          </button>
        ) : null}
        {embedded ? null : (
          <button
            className="crm-action crm-action-muted"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        )}
        <button
          className="crm-action"
          disabled={!canSave}
          onClick={() => void save()}
          type="button"
        >
          {editing ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {editing ? "Atualizar" : "Criar etiqueta"}
        </button>
      </footer>
    </div>
  );

  return embedded ? (
    <section
      aria-label="Etiquetas WhatsApp"
      className="crm-whatsapp-tag-manager-page"
    >
      {panel}
      {tagToDelete ? (
        <TagDeleteConfirm
          disabled={Boolean(disabled) || Boolean(pendingAction)}
          onCancel={() => setTagToDelete(null)}
          onConfirm={() => void deleteTag()}
          tag={tagToDelete}
        />
      ) : null}
    </section>
  ) : (
    <div
      aria-label="Etiquetas WhatsApp"
      aria-modal="true"
      className="crm-whatsapp-action-dialog"
      role="dialog"
    >
      {panel}
      {tagToDelete ? (
        <TagDeleteConfirm
          disabled={Boolean(disabled) || Boolean(pendingAction)}
          onCancel={() => setTagToDelete(null)}
          onConfirm={() => void deleteTag()}
          tag={tagToDelete}
        />
      ) : null}
    </div>
  );
}
