import { Check, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import type {
  CrmAddConversationCycleTagInput,
  CrmTag,
} from "./crmConversationTypes";

const DEFAULT_TAG_OPTIONS: CrmAddConversationCycleTagInput[] = [
  { emoji: "🔥", name: "Quente" },
  { emoji: "📞", name: "Retorno" },
];

export function TagMenu({
  activeTags,
  availableTags,
  disabled,
  onAdd,
}: {
  activeTags: CrmTag[];
  availableTags: CrmTag[];
  disabled?: boolean;
  onAdd: (input: CrmAddConversationCycleTagInput) => Promise<boolean>;
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
  const addTag = async (input: CrmAddConversationCycleTagInput) => {
    if (disabled || isSaving) return;
    setIsSaving(true);
    try {
      await onAdd(input);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="crm-tag-menu">
      <label className="crm-tag-search">
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
            className="crm-tag-search-clear"
            onClick={() => setSearch("")}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </label>
      {filteredTags.length ? (
        <div className="crm-tag-list" aria-label="Etiquetas">
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
                      ? "crm-tag-check crm-tag-check-active"
                      : "crm-tag-check"
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
        <div className="crm-tag-presets">
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
        className="crm-tag-custom"
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
