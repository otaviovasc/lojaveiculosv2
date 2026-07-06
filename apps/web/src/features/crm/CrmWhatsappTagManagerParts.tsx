import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import type { CrmWhatsappTag } from "./crmWhatsappTypes";

export function TagAdminRow({
  disabled,
  index,
  onDelete,
  onEdit,
  onMove,
  saving,
  tag,
  tagsLength,
}: {
  disabled?: boolean;
  index: number;
  onDelete: (tag: CrmWhatsappTag) => void;
  onEdit: (tag: CrmWhatsappTag) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  saving: boolean;
  tag: CrmWhatsappTag;
  tagsLength: number;
}) {
  return (
    <article className="crm-whatsapp-tag-admin-row">
      <i
        aria-hidden="true"
        style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
      />
      <strong>
        {tag.emoji ? `${tag.emoji} ` : ""}
        {tag.name}
      </strong>
      <div className="crm-whatsapp-template-actions">
        <button
          aria-label={`Subir etiqueta ${tag.name}`}
          disabled={disabled || index === 0 || saving}
          onClick={() => onMove(index, -1)}
          type="button"
        >
          <ArrowUp />
        </button>
        <button
          aria-label={`Descer etiqueta ${tag.name}`}
          disabled={disabled || index === tagsLength - 1 || saving}
          onClick={() => onMove(index, 1)}
          type="button"
        >
          <ArrowDown />
        </button>
        <button
          aria-label={`Editar etiqueta ${tag.name}`}
          disabled={disabled || saving}
          onClick={() => onEdit(tag)}
          type="button"
        >
          <Pencil />
        </button>
        <button
          aria-label={`Excluir etiqueta ${tag.name}`}
          disabled={disabled || saving}
          onClick={() => onDelete(tag)}
          type="button"
        >
          <Trash2 />
        </button>
      </div>
    </article>
  );
}
