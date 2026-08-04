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
      {tags.slice(0, 4).map((tag) => {
        const tagColor = tag.color ?? "var(--color-muted)";
        return (
          <span
            className="crm-whatsapp-tag-chip"
            key={tag.id}
            style={{
              backgroundColor: `color-mix(in srgb, ${tagColor} 16%, var(--color-panel))`,
              borderColor: `color-mix(in srgb, ${tagColor} 35%, var(--color-line))`,
              color: `color-mix(in srgb, ${tagColor} 90%, var(--color-text))`,
            }}
          >
            <span
              aria-hidden="true"
              className="crm-whatsapp-tag-dot"
              style={{ backgroundColor: tagColor }}
            />
            <span className="crm-whatsapp-tag-chip-name">
              {tag.emoji ? `${tag.emoji} ` : ""}
              {tag.name}
            </span>
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
              <X aria-hidden="true" />
            </button>
          </span>
        );
      })}
      {tags.length > 4 ? (
        <span className="crm-whatsapp-tag-chip crm-whatsapp-tag-chip-muted">
          +{tags.length - 4}
        </span>
      ) : null}
    </div>
  );
}
