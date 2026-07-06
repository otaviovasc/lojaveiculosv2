import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Pencil,
  Trash2,
} from "lucide-react";
import type {
  CrmWhatsappCreateTagInput,
  CrmWhatsappTag,
  CrmWhatsappUpdateTagInput,
} from "./crmWhatsappTypes";

export type TagDraft = { color: string; emoji: string; name: string };

export type PendingTagAction =
  { kind: "delete"; tagId: string } | { kind: "move"; tagId: string } | null;

export function TagDraftFields({
  disabled,
  draft,
  onChange,
}: {
  disabled?: boolean;
  draft: TagDraft;
  onChange: (draft: TagDraft) => void;
}) {
  const updateDraft = (patch: Partial<TagDraft>) =>
    onChange({ ...draft, ...patch });

  return (
    <>
      <div className="crm-whatsapp-action-grid">
        <label>
          Nome
          <input
            disabled={disabled}
            maxLength={40}
            onChange={(event) => updateDraft({ name: event.target.value })}
            placeholder="Cliente quente"
            value={draft.name}
          />
        </label>
        <label>
          Emoji
          <input
            disabled={disabled}
            maxLength={16}
            onChange={(event) => updateDraft({ emoji: event.target.value })}
            placeholder="Opcional"
            value={draft.emoji}
          />
        </label>
      </div>
      <label>
        Cor
        <input
          disabled={disabled}
          onChange={(event) => updateDraft({ color: event.target.value })}
          placeholder="#RRGGBB"
          value={draft.color}
        />
      </label>
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
  onDelete: (tag: CrmWhatsappTag) => void;
  onEdit: (tag: CrmWhatsappTag) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  pendingAction: PendingTagAction;
  tag: CrmWhatsappTag;
  tagsLength: number;
}) {
  const actionDisabled = Boolean(disabled);
  const isMoving =
    pendingAction?.kind === "move" && pendingAction.tagId === tag.id;
  const isDeleting =
    pendingAction?.kind === "delete" && pendingAction.tagId === tag.id;

  return (
    <article
      aria-label={`Etiqueta ${tag.name}, ordem ${index + 1} de ${tagsLength}`}
      className="crm-whatsapp-tag-admin-row"
    >
      <i
        aria-hidden="true"
        style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
      />
      <span className="crm-whatsapp-tag-admin-label">
        <strong>
          {tag.emoji ? `${tag.emoji} ` : ""}
          {tag.name}
        </strong>
        <small>
          {isMoving
            ? "Reordenando"
            : isDeleting
              ? "Excluindo"
              : `Ordem ${index + 1} de ${tagsLength}`}
        </small>
      </span>
      <div className="crm-whatsapp-template-actions">
        <button
          aria-label={`Subir etiqueta ${tag.name}`}
          disabled={actionDisabled || index === 0}
          onClick={() => onMove(index, -1)}
          title={`Subir etiqueta ${tag.name}`}
          type="button"
        >
          <ArrowUp />
        </button>
        <button
          aria-label={`Descer etiqueta ${tag.name}`}
          disabled={actionDisabled || index === tagsLength - 1}
          onClick={() => onMove(index, 1)}
          title={`Descer etiqueta ${tag.name}`}
          type="button"
        >
          <ArrowDown />
        </button>
        <button
          aria-label={`Editar etiqueta ${tag.name}`}
          disabled={actionDisabled}
          onClick={() => onEdit(tag)}
          title={`Editar etiqueta ${tag.name}`}
          type="button"
        >
          <Pencil />
        </button>
        <button
          aria-label={`Excluir etiqueta ${tag.name}`}
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
  tag: CrmWhatsappTag;
}) {
  return (
    <div className="crm-whatsapp-tag-confirm" role="presentation">
      <section
        aria-label={`Excluir etiqueta ${tag.name}`}
        aria-modal="true"
        className="crm-whatsapp-tag-confirm-panel"
        role="dialog"
      >
        <span className="crm-whatsapp-tag-confirm-icon">
          <AlertTriangle aria-hidden="true" />
        </span>
        <div>
          <strong>Excluir etiqueta?</strong>
          <p>
            A etiqueta {tag.emoji ? `${tag.emoji} ` : ""}
            {tag.name} sera removida das conversas.
          </p>
        </div>
        <footer>
          <button
            className="crm-action crm-action-muted"
            disabled={disabled}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="crm-action crm-action-danger"
            disabled={disabled}
            onClick={onConfirm}
            type="button"
          >
            Excluir
          </button>
        </footer>
      </section>
    </div>
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
  tagToDelete: CrmWhatsappTag | null;
}) {
  if (pendingAction?.kind === "move") return "Reordenando etiquetas.";
  if (pendingAction?.kind === "delete") {
    return `Excluindo ${tagToDelete?.name ?? "etiqueta"}.`;
  }
  if (isSaving) return editing ? "Atualizando etiqueta." : "Criando etiqueta.";
  return null;
}

export function toCreateTagInput(draft: TagDraft): CrmWhatsappCreateTagInput {
  const color = draft.color.trim();
  const emoji = draft.emoji.trim();
  return {
    ...(color ? { color } : {}),
    ...(emoji ? { emoji } : {}),
    name: draft.name.trim(),
  };
}

export function toUpdateTagInput(draft: TagDraft): CrmWhatsappUpdateTagInput {
  return {
    ...(draft.color.trim() ? { color: draft.color.trim() } : {}),
    emoji: draft.emoji.trim() || null,
    name: draft.name.trim(),
  };
}
