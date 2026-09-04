import { ArrowDown, ArrowUp, Pencil, Trash2, Zap } from "lucide-react";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  TagColorPicker,
  TagDraftPreview,
  TagEmojiPicker,
  tagSuggestionPresets,
} from "./CrmTagDraftTools";
import type {
  CrmCreateTagInput,
  CrmTag,
  CrmUpdateTagInput,
} from "./crmConversationTypes";

export type TagDraft = { color: string; emoji: string; name: string };

export type PendingTagAction =
  { kind: "delete"; tagId: string } | { kind: "move"; tagId: string } | null;

export async function runPendingTagAction({
  action,
  failureMessage,
  onAccepted,
  operation,
  setLocalError,
  setPendingAction,
}: {
  action: Exclude<PendingTagAction, null>;
  failureMessage: string;
  onAccepted?: () => void;
  operation: () => Promise<boolean>;
  setLocalError: (message: string | null) => void;
  setPendingAction: (action: PendingTagAction) => void;
}) {
  setPendingAction(action);
  setLocalError(null);
  try {
    const accepted = await operation();
    if (accepted) onAccepted?.();
    else setLocalError(failureMessage);
  } finally {
    setPendingAction(null);
  }
}

export function TagDraftFields({
  disabled,
  draft,
  isEditing,
  onChange,
}: {
  disabled?: boolean;
  draft: TagDraft;
  isEditing?: boolean;
  onChange: (draft: TagDraft) => void;
}) {
  const updateDraft = (patch: Partial<TagDraft>) =>
    onChange({ ...draft, ...patch });
  const isEmpty = !draft.name && !draft.color && !draft.emoji;

  return (
    <>
      <TagDraftPreview draft={draft} />

      {/* Quick-start suggestions — shown only when creating and draft is empty */}
      {!isEditing && isEmpty ? (
        <section aria-label="Sugestões rápidas" className="crm-tag-suggestions">
          <div className="crm-tag-group-header">
            <span>
              <Zap aria-hidden="true" className="size-3.5" />
              Início rápido
            </span>
            <span className="crm-tag-group-subtitle">
              Clique em uma sugestão para preencher automaticamente.
            </span>
          </div>
          <div className="crm-tag-suggestion-grid">
            {tagSuggestionPresets.map((preset) => (
              <button
                className="crm-tag-suggestion-chip"
                disabled={disabled}
                key={preset.name}
                onClick={() =>
                  onChange({
                    color: preset.color,
                    emoji: preset.emoji,
                    name: preset.name,
                  })
                }
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="crm-tag-dot"
                  style={{ backgroundColor: preset.color }}
                />
                <span>
                  {preset.emoji} {preset.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="crm-tag-draft-name">
        <label>
          Nome
          <input
            disabled={disabled}
            maxLength={40}
            onChange={(event) => updateDraft({ name: event.target.value })}
            placeholder="ex: Cliente quente"
            value={draft.name}
          />
        </label>
      </div>
      <TagColorPicker
        disabled={disabled}
        draft={draft}
        onChange={updateDraft}
      />
      <TagEmojiPicker
        disabled={disabled}
        draft={draft}
        onChange={updateDraft}
      />
    </>
  );
}

export function TagAdminRow({
  disabled,
  index,
  onDelete,
  onEdit,
  onMove,
  pendingAction,
  tag,
  tagsLength,
}: {
  disabled?: boolean;
  index: number;
  onDelete: (tag: CrmTag) => void;
  onEdit: (tag: CrmTag) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  pendingAction: PendingTagAction;
  tag: CrmTag;
  tagsLength: number;
}) {
  const actionDisabled = Boolean(disabled);
  const isMoving =
    pendingAction?.kind === "move" && pendingAction.tagId === tag.id;
  const isDeleting =
    pendingAction?.kind === "delete" && pendingAction.tagId === tag.id;
  const tagColor = tag.color ?? "var(--color-muted)";
  const orderFormatted = String(index + 1).padStart(2, "0");

  return (
    <article
      aria-label={`Etiqueta ${tag.name}, ordem ${index + 1} de ${tagsLength}`}
      className="crm-tag-admin-row"
    >
      <div className="crm-tag-admin-main">
        <span className="crm-tag-order-index" title={`Posição ${index + 1}`}>
          #{orderFormatted}
        </span>
        <div className="crm-tag-admin-info">
          <strong
            className="crm-tag-admin-pill"
            style={{
              backgroundColor: `color-mix(in srgb, ${tagColor} 16%, var(--color-panel))`,
              borderColor: `color-mix(in srgb, ${tagColor} 40%, var(--color-line))`,
              color: `color-mix(in srgb, ${tagColor} 90%, var(--color-text))`,
            }}
          >
            <span
              aria-hidden="true"
              className="crm-tag-dot"
              style={{ backgroundColor: tagColor }}
            />
            {tag.emoji ? (
              <span className="crm-tag-emoji">{tag.emoji}</span>
            ) : null}
            <span className="crm-tag-name">{tag.name}</span>
          </strong>
          <small className="crm-tag-order-caption">
            {isMoving
              ? "Reordenando..."
              : isDeleting
                ? "Excluindo..."
                : `Ordem ${index + 1} de ${tagsLength}`}
          </small>
        </div>
      </div>
      <div className="crm-template-actions">
        <button
          aria-label={`Subir etiqueta ${tag.name}`}
          className="crm-tag-action-btn"
          disabled={actionDisabled || index === 0}
          onClick={() => onMove(index, -1)}
          title={`Subir etiqueta ${tag.name}`}
          type="button"
        >
          <ArrowUp />
        </button>
        <button
          aria-label={`Descer etiqueta ${tag.name}`}
          className="crm-tag-action-btn"
          disabled={actionDisabled || index === tagsLength - 1}
          onClick={() => onMove(index, 1)}
          title={`Descer etiqueta ${tag.name}`}
          type="button"
        >
          <ArrowDown />
        </button>
        <button
          aria-label={`Editar etiqueta ${tag.name}`}
          className="crm-tag-action-btn"
          disabled={actionDisabled}
          onClick={() => onEdit(tag)}
          title={`Editar etiqueta ${tag.name}`}
          type="button"
        >
          <Pencil />
        </button>
        <button
          aria-label={`Excluir etiqueta ${tag.name}`}
          className="crm-tag-action-btn crm-tag-delete-btn"
          disabled={actionDisabled}
          onClick={() => onDelete(tag)}
          title={`Excluir etiqueta ${tag.name}`}
          type="button"
        >
          <Trash2 />
        </button>
      </div>
    </article>
  );
}

export function TagDeleteConfirm({
  disabled,
  onCancel,
  onConfirm,
  tag,
}: {
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  tag: CrmTag;
}) {
  return (
    <ConfirmDialog
      confirmLabel="Excluir"
      description={`A etiqueta ${tag.emoji ? `${tag.emoji} ` : ""}${tag.name} sera removida das conversas.`}
      isLoading={Boolean(disabled)}
      isOpen
      loadingLabel="Excluindo..."
      onClose={onCancel}
      onConfirm={onConfirm}
      title={`Excluir etiqueta ${tag.name}`}
      variant="destructive"
    />
  );
}

export function getTagStatusMessage({
  editing,
  isSaving,
  pendingAction,
  tagToDelete,
}: {
  editing: boolean;
  isSaving: boolean;
  pendingAction: PendingTagAction;
  tagToDelete: CrmTag | null;
}) {
  if (pendingAction?.kind === "move") return "Reordenando etiquetas.";
  if (pendingAction?.kind === "delete") {
    return `Excluindo ${tagToDelete?.name ?? "etiqueta"}.`;
  }
  if (isSaving) return editing ? "Atualizando etiqueta." : "Criando etiqueta.";
  return null;
}

export function toCreateTagInput(draft: TagDraft): CrmCreateTagInput {
  const color = draft.color.trim();
  const emoji = draft.emoji.trim();
  return {
    ...(color ? { color } : {}),
    ...(emoji ? { emoji } : {}),
    name: draft.name.trim(),
  };
}

export function toUpdateTagInput(draft: TagDraft): CrmUpdateTagInput {
  return {
    ...(draft.color.trim() ? { color: draft.color.trim() } : {}),
    emoji: draft.emoji.trim() || null,
    name: draft.name.trim(),
  };
}
