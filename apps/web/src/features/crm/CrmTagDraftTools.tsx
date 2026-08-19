import { Check, Sparkles, X } from "lucide-react";
import type { TagDraft } from "./CrmTagManagerParts";

export const tagColorPresets = [
  { label: "Destaque", value: "var(--color-accent)" },
  { label: "Urgente", value: "var(--color-danger)" },
  { label: "Atenção", value: "var(--color-warning)" },
  { label: "Sucesso", value: "var(--color-success)" },
  { label: "Proposta", value: "var(--color-info)" },
  { label: "VIP", value: "var(--color-primary)" },
  { label: "Info", value: "var(--color-sales)" },
  { label: "Neutra", value: "var(--color-muted)" },
];

export const tagEmojiPresets = [
  "🔥",
  "⭐",
  "🚗",
  "💰",
  "🤝",
  "📞",
  "💬",
  "✅",
  "⏳",
  "💎",
  "👑",
  "🎯",
  "🚀",
  "⚡",
  "📌",
  "🏷️",
  "",
];

export const tagSuggestionPresets: {
  color: string;
  emoji: string;
  name: string;
}[] = [
  { color: "var(--color-danger)", emoji: "🔥", name: "Cliente quente" },
  { color: "var(--color-warning)", emoji: "📞", name: "Aguardando retorno" },
  { color: "var(--color-primary)", emoji: "⭐", name: "Cliente VIP" },
  { color: "var(--color-success)", emoji: "💰", name: "Proposta enviada" },
];

export function TagDraftPreview({ draft }: { draft: TagDraft }) {
  const tagColor = draft.color || "var(--color-muted)";
  const nameText = draft.name.trim() || "Nova etiqueta";

  return (
    <div className="crm-tag-draft-preview">
      <div className="crm-tag-draft-preview-header">
        <Sparkles aria-hidden="true" className="crm-tag-sparkle-icon" />
        <span>Prévia</span>
      </div>
      <div className="crm-tag-draft-preview-inline">
        <span
          className="crm-tag-chip"
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
          <span>
            {draft.emoji ? `${draft.emoji} ` : ""}
            {nameText}
          </span>
        </span>
        <strong
          className="crm-tag-admin-pill"
          style={{
            backgroundColor: `color-mix(in srgb, ${tagColor} 18%, var(--color-panel))`,
            borderColor: `color-mix(in srgb, ${tagColor} 45%, var(--color-line))`,
            color: `color-mix(in srgb, ${tagColor} 90%, var(--color-text))`,
          }}
        >
          <span
            aria-hidden="true"
            className="crm-tag-dot"
            style={{ backgroundColor: tagColor }}
          />
          {draft.emoji ? `${draft.emoji} ` : ""}
          {nameText}
        </strong>
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
    <section className="crm-tag-draft-group" aria-label="Cores">
      <span>Cor da etiqueta</span>
      <div className="crm-tag-color-grid">
        {tagColorPresets.map((preset) => {
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
      <label className="crm-tag-custom-color">
        <span>Cor personalizada</span>
        <div className="crm-tag-input-with-preview">
          <span
            aria-hidden="true"
            className="crm-tag-color-swatch-preview"
            style={{
              backgroundColor: draft.color || "var(--color-muted)",
            }}
          />
          <input
            disabled={disabled}
            onChange={(event) => onChange({ color: event.target.value })}
            placeholder="ex: var(--color-primary)"
            value={draft.color}
          />
        </div>
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
    <section className="crm-tag-draft-group" aria-label="Emojis">
      <span>Emoji rápido</span>
      <div className="crm-tag-emoji-grid">
        {tagEmojiPresets.map((emoji) => (
          <button
            aria-label={emoji ? `Usar emoji ${emoji}` : "Remover emoji"}
            aria-pressed={draft.emoji === emoji}
            disabled={disabled}
            key={emoji || "none"}
            onClick={() => onChange({ emoji })}
            type="button"
          >
            {emoji || <X aria-hidden="true" className="size-4" />}
          </button>
        ))}
      </div>
      <label className="crm-tag-custom-emoji">
        <span>Emoji</span>
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
