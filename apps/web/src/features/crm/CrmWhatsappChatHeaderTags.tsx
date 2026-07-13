import { X } from "lucide-react";
import type { CrmWhatsappTag } from "./crmWhatsappTypes";

export function SessionTagRow({
  disabled,
  onRemoveTag,
  tags,
}: {
  disabled?: boolean;
  onRemoveTag: (tagId: string) => Promise<boolean>;
  tags: CrmWhatsappTag[];
}) {
  if (!tags.length) return null;
  return (
    <div className="crm-whatsapp-tag-row" aria-label="Etiquetas da conversa">
      {tags.slice(0, 4).map((tag) => (
        <span className="crm-whatsapp-tag-chip" key={tag.id}>
          <span
            aria-hidden="true"
            style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
          />
          {tag.name}
          <button
            aria-label={`Remover etiqueta ${tag.name}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              void onRemoveTag(tag.id);
            }}
            title="Remover etiqueta"
            type="button"
          >
            <X />
          </button>
        </span>
      ))}
      {tags.length > 4 ? (
        <span className="crm-whatsapp-tag-chip crm-whatsapp-tag-chip-muted">
          +{tags.length - 4}
        </span>
      ) : null}
    </div>
  );
}
