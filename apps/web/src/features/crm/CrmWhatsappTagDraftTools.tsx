import { Check, X } from "lucide-react";
import type { TagDraft } from "./CrmWhatsappTagManagerParts";

const colorPresets = [
  { label: "Destaque", value: "var(--color-accent)" },
  { label: "Urgente", value: "var(--color-danger)" },
  { label: "Atencao", value: "var(--color-warning)" },
  { label: "Sucesso", value: "var(--color-success)" },
  { label: "Primaria", value: "var(--color-primary)" },
  { label: "Neutra", value: "var(--color-muted)" },
];

const emojiPresets = ["🔥", "⭐", "✅", "💬", "📞", "🚗", "🎯", "⏳", "👑", ""];

export function TagDraftPreview({ draft }: { draft: TagDraft }) {
  return (
    <div className="crm-whatsapp-tag-draft-preview">
      <span>Previa</span>
      <strong style={{ backgroundColor: draft.color || "var(--color-muted)" }}>
        {draft.emoji ? `${draft.emoji} ` : ""}
        {draft.name.trim() || "Nova etiqueta"}
      </strong>
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
      <span>Cor</span>
      <div className="crm-whatsapp-tag-color-grid">
        {colorPresets.map((preset) => (
          <button
            aria-label={`Usar cor ${preset.label}`}
            aria-pressed={draft.color === preset.value}
            disabled={disabled}
            key={preset.value}
            onClick={() => onChange({ color: preset.value })}
            type="button"
          >
            <i aria-hidden="true" style={{ backgroundColor: preset.value }} />
            {draft.color === preset.value ? <Check aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      <label className="crm-whatsapp-tag-custom-color">
        Cor personalizada
        <input
          disabled={disabled}
          onChange={(event) => onChange({ color: event.target.value })}
          placeholder="var(--color-primary)"
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
          placeholder="Opcional"
          value={draft.emoji}
        />
      </label>
    </section>
  );
}
