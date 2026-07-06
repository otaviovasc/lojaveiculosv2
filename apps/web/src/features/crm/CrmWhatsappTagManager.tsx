import { Plus, Save, Tag, X } from "lucide-react";
import { useState } from "react";
import type {
  CrmWhatsappCreateTagInput,
  CrmWhatsappReorderTagsInput,
  CrmWhatsappTag,
  CrmWhatsappUpdateTagInput,
} from "./crmWhatsappTypes";
import { TagAdminRow } from "./CrmWhatsappTagManagerParts";

type TagDraft = {
  color: string;
  emoji: string;
  name: string;
};

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
  const [savingTagId, setSavingTagId] = useState<string | null>(null);
  const canSave = Boolean(draft.name.trim()) && !isSaving && !disabled;

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
        ? await onUpdate(editing.id, toUpdateInput(draft))
        : await onCreate(toCreateInput(draft));
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

  const deleteTag = async (tag: CrmWhatsappTag) => {
    if (disabled || savingTagId) return;
    setSavingTagId(tag.id);
    setLocalError(null);
    try {
      const accepted = await onDelete(tag.id);
      if (!accepted) setLocalError("Nao foi possivel excluir a etiqueta.");
      if (editing?.id === tag.id) reset();
    } finally {
      setSavingTagId(null);
    }
  };

  const moveTag = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (disabled || targetIndex < 0 || targetIndex >= tags.length) return;
    const tagIds = tags.map((tag) => tag.id);
    const currentTagId = tagIds[index];
    const targetTagId = tagIds[targetIndex];
    if (!currentTagId || !targetTagId) return;
    tagIds[index] = targetTagId;
    tagIds[targetIndex] = currentTagId;
    setSavingTagId(currentTagId);
    setLocalError(null);
    try {
      const accepted = await onReorder({ tagIds });
      if (!accepted) setLocalError("Nao foi possivel reordenar etiquetas.");
    } finally {
      setSavingTagId(null);
    }
  };

  return (
    <div
      aria-label="Etiquetas WhatsApp"
      aria-modal={embedded ? undefined : true}
      className={
        embedded
          ? "crm-whatsapp-action-dialog crm-whatsapp-action-embedded"
          : "crm-whatsapp-action-dialog"
      }
      role={embedded ? "region" : "dialog"}
    >
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
          <div className="crm-whatsapp-action-grid">
            <label>
              Nome
              <input
                disabled={disabled || isSaving}
                maxLength={40}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Cliente quente"
                value={draft.name}
              />
            </label>
            <label>
              Emoji
              <input
                disabled={disabled || isSaving}
                maxLength={16}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    emoji: event.target.value,
                  }))
                }
                placeholder="Opcional"
                value={draft.emoji}
              />
            </label>
          </div>
          <label>
            Cor
            <input
              disabled={disabled || isSaving}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  color: event.target.value,
                }))
              }
              placeholder="#RRGGBB"
              value={draft.color}
            />
          </label>
          <p className="crm-whatsapp-tag-manager-note">
            Etiquetas sao labels simples para organizar conversas. Pipeline e
            coluna nao existem mais neste fluxo.
          </p>
          {localError ? (
            <p className="crm-whatsapp-tag-manager-error">{localError}</p>
          ) : null}
          <div className="crm-whatsapp-tag-admin-list">
            {tags.length ? (
              tags.map((tag, index) => (
                <TagAdminRow
                  disabled={Boolean(disabled)}
                  index={index}
                  key={tag.id}
                  onDelete={(nextTag) => void deleteTag(nextTag)}
                  onEdit={editTag}
                  onMove={(nextIndex, direction) =>
                    void moveTag(nextIndex, direction)
                  }
                  saving={Boolean(savingTagId)}
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
            {editing ? (
              <Save aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {editing ? "Atualizar" : "Criar etiqueta"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function toCreateInput(draft: TagDraft): CrmWhatsappCreateTagInput {
  return {
    ...(draft.color.trim() ? { color: draft.color.trim() } : {}),
    ...(draft.emoji.trim() ? { emoji: draft.emoji.trim() } : {}),
    name: draft.name.trim(),
  };
}

function toUpdateInput(draft: TagDraft): CrmWhatsappUpdateTagInput {
  return {
    ...(draft.color.trim() ? { color: draft.color.trim() } : {}),
    emoji: draft.emoji.trim() || null,
    name: draft.name.trim(),
  };
}
