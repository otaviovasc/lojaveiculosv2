import { Check, Sparkles, X } from "lucide-react";
import type { TagDraft } from "./CrmWhatsappTagManagerParts";

const colorPresets = [
  { label: "Destaque", value: "var(--color-accent)" },
  { label: "Urgente", value: "var(--color-danger)" },
  { label: "Atenção", value: "var(--color-warning)" },
  { label: "Sucesso", value: "var(--color-success)" },
  { label: "Primaria", value: "var(--color-primary)" },
  { label: "Info", value: "var(--color-info)" },
  { label: "Vendas", value: "var(--color-sales)" },
  { label: "Neutra", value: "var(--color-muted)" },
];

const emojiPresets = [
  "🔥",
  "⭐",
  "✅",
  "💬",
  "📞",
  "🚗",
  "🎯",
  "⏳",
  "👑",
  "💎",
  "🤝",
  "⚡",
  "📌",
  "🏷️",
  "",
];

export function TagDraftPreview({ draft }: { draft: TagDraft }) {
  const tagColor = draft.color || "var(--color-muted)";
  const nameText = draft.name.trim() || "Nova etiqueta";

  return (
    <div className="crm-whatsapp-tag-draft-preview">
      <div className="crm-whatsapp-tag-draft-preview-header">
        <Sparkles
          aria-hidden="true"
          className="crm-whatsapp-tag-sparkle-icon"
        />
        <span>Previa em tempo real</span>
      </div>
      <div className="crm-whatsapp-tag-draft-preview-grid">
        <div className="crm-whatsapp-tag-draft-sample-box">
          <span className="crm-whatsapp-tag-draft-sample-title">
            Chip na conversa
          </span>
          <span
            className="crm-whatsapp-tag-chip"
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
            <span>
              {draft.emoji ? `${draft.emoji} ` : ""}
              {nameText}
            </span>
          </span>
        </div>
        <div className="crm-whatsapp-tag-draft-sample-box">
          <span className="crm-whatsapp-tag-draft-sample-title">
            Emblema no gerenciador
          </span>
          <strong
            className="crm-whatsapp-tag-admin-pill"
            style={{
              backgroundColor: `color-mix(in srgb, ${tagColor} 20%, var(--color-panel))`,
              borderColor: `color-mix(in srgb, ${tagColor} 45%, var(--color-line))`,
              color: `color-mix(in srgb, ${tagColor} 90%, var(--color-text))`,
            }}
          >
            <span
              aria-hidden="true"
              className="crm-whatsapp-tag-dot"
              style={{ backgroundColor: tagColor }}
            />
            {draft.emoji ? `${draft.emoji} ` : ""}
            {nameText}
          </strong>
        </div>
      </div>
    </div>
  );
}

export function TagColorPicker({
  disabled,
  draft,
  onChange,
}: {
  disabled?: boolean | undefined;
  draft: TagDraft;
  onChange: (patch: Partial<TagDraft>) => void;
}) {
  return (
    <section className="crm-whatsapp-tag-draft-group" aria-label="Cores">
      <span>Cor da etiqueta</span>
      <div className="crm-whatsapp-tag-color-grid">
        {colorPresets.map((preset) => {
          const isSelected = draft.color === preset.value;
          return (
            <button
              aria-label={`Usar cor ${preset.label}`}
              aria-pressed={isSelected}
              disabled={disabled}
              key={preset.value}
              onClick={() => onChange({ color: preset.value })}
              title={preset.label}
              type="button"
            >
              <i aria-hidden="true" style={{ backgroundColor: preset.value }} />
              {isSelected ? <Check aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <label className="crm-whatsapp-tag-custom-color">
        Cor personalizada
        <input
          disabled={disabled}
          onChange={(event) => onChange({ color: event.target.value })}
          placeholder="ex: var(--color-primary)"
          value={draft.color}
        />
      </label>
    </section>
  );
}

export function TagEmojiPicker({
  disabled,
  draft,
  onChange,
}: {
  disabled?: boolean | undefined;
  draft: TagDraft;
  onChange: (patch: Partial<TagDraft>) => void;
}) {
  return (
    <section className="crm-whatsapp-tag-draft-group" aria-label="Emojis">
      <span>Emoji rapido</span>
      <div className="crm-whatsapp-tag-emoji-grid">
        {emojiPresets.map((emoji) => (
          <button
            aria-label={emoji ? `Usar emoji ${emoji}` : "Remover emoji"}
            aria-pressed={draft.emoji === emoji}
            disabled={disabled}
            key={emoji || "none"}
            onClick={() => onChange({ emoji })}
            type="button"
          >
            {emoji || <X aria-hidden="true" />}
          </button>
        ))}
      </div>
      <label className="crm-whatsapp-tag-custom-emoji">
        Emoji
        <input
          disabled={disabled}
          maxLength={16}
          onChange={(event) => onChange({ emoji: event.target.value })}
          placeholder="Opcional (ex: 🚀)"
          value={draft.emoji}
        />
      </label>
    </section>
  );
}
