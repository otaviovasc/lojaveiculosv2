import { Check, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

const DEFAULT_TAG_OPTIONS: CrmWhatsappAddSessionTagInput[] = [
  { emoji: "🔥", name: "Quente" },
  { emoji: "📞", name: "Retorno" },
];

export function TagMenu({
  activeTags,
  availableTags,
  disabled,
  onAdd,
}: {
  activeTags: CrmWhatsappTag[];
  availableTags: CrmWhatsappTag[];
  disabled?: boolean;
  onAdd: (input: CrmWhatsappAddSessionTagInput) => Promise<boolean>;
}) {
  const [customName, setCustomName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const activeTagIds = new Set(activeTags.map((tag) => tag.id));
  const assignedNames = new Set(
    activeTags.map((tag) => tag.name.toLocaleLowerCase("pt-BR")),
  );
  const filteredTags = availableTags.filter((tag) =>
    tag.name
      .toLocaleLowerCase("pt-BR")
      .includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  const addTag = async (input: CrmWhatsappAddSessionTagInput) => {
    if (disabled || isSaving) return;
    setIsSaving(true);
    try {
      await onAdd(input);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="crm-whatsapp-tag-menu">
      <label className="crm-whatsapp-tag-search">
        <Search aria-hidden="true" />
        <input
          disabled={disabled || isSaving}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar etiqueta"
          value={search}
        />
        {search ? (
          <button
            aria-label="Limpar busca de etiqueta"
            className="crm-whatsapp-tag-search-clear"
            onClick={() => setSearch("")}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </label>
      {filteredTags.length ? (
        <div className="crm-whatsapp-tag-list" aria-label="Etiquetas">
          {filteredTags.map((tag) => {
            const assigned =
              activeTagIds.has(tag.id) ||
              assignedNames.has(tag.name.toLocaleLowerCase("pt-BR"));
            const tagColor = tag.color ?? "var(--color-muted)";
            return (
              <button
                aria-pressed={assigned}
                disabled={disabled || isSaving}
                key={tag.id}
                onClick={() => {
                  if (!assigned) {
                    void addTag({
                      ...(tag.color === undefined ? {} : { color: tag.color }),
                      ...(tag.emoji === undefined ? {} : { emoji: tag.emoji }),
                      name: tag.name,
                    });
                  }
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={
                    assigned
                      ? "crm-whatsapp-tag-check crm-whatsapp-tag-check-active"
                      : "crm-whatsapp-tag-check"
                  }
                >
                  {assigned ? <Check aria-hidden="true" /> : null}
                </span>
                <i aria-hidden="true" style={{ backgroundColor: tagColor }} />
                <span>
                  {tag.emoji ? `${tag.emoji} ` : ""}
                  {tag.name}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="crm-whatsapp-tag-presets">
          {DEFAULT_TAG_OPTIONS.map((tag) => (
            <button
              disabled={disabled || isSaving}
              key={tag.name}
              onClick={() => void addTag(tag)}
              type="button"
            >
              <span
                aria-hidden="true"
                style={{ backgroundColor: tag.color ?? "var(--color-muted)" }}
              />
              {tag.emoji ? `${tag.emoji} ` : ""}
              {tag.name}
            </button>
          ))}
        </div>
      )}
      <form
        className="crm-whatsapp-tag-custom"
        onSubmit={(event) => {
          event.preventDefault();
          const name = customName.trim();
          if (!name) return;
          void addTag({ name });
          setCustomName("");
        }}
      >
        <input
          disabled={disabled || isSaving}
          maxLength={40}
          onChange={(event) => setCustomName(event.target.value)}
          placeholder="Nova etiqueta"
          value={customName}
        />
        <button
          aria-label="Criar etiqueta"
          className="crm-icon-action"
          disabled={disabled || isSaving || !customName.trim()}
          type="submit"
        >
          <Plus aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
