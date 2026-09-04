import { Check, Plus, Search, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Morphicon } from "../../components/ui/Morphicon";
import type {
  CrmAddConversationCycleTagInput,
  CrmTag,
} from "./crmConversationTypes";

const DEFAULT_TAG_OPTIONS: CrmAddConversationCycleTagInput[] = [
  { color: "var(--color-danger)", emoji: "🔥", name: "Quente" },
  { color: "var(--color-info)", emoji: "📞", name: "Retorno" },
  { color: "var(--color-success)", emoji: "🚗", name: "Test Drive" },
  { color: "var(--color-warning)", emoji: "💰", name: "Proposta" },
  { color: "var(--color-accent)", emoji: "⏳", name: "Aguardando" },
];

export function TagMenu({
  activeTags,
  availableTags,
  disabled,
  onAdd,
  onRemove,
}: {
  activeTags: CrmTag[];
  availableTags: CrmTag[];
  disabled?: boolean;
  onAdd: (input: CrmAddConversationCycleTagInput) => Promise<boolean>;
  onRemove?: (tagId: string) => Promise<boolean>;
}) {
  const [customName, setCustomName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const activeTagMap = useMemo(() => {
    const map = new Map<string, CrmTag>();
    for (const tag of activeTags) {
      map.set(tag.id, tag);
      map.set(tag.name.toLocaleLowerCase("pt-BR"), tag);
    }
    return map;
  }, [activeTags]);

  const filteredTags = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return availableTags;
    return availableTags.filter((tag) =>
      tag.name.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [availableTags, search]);

  const handleToggleTag = async (tag: {
    color?: string | null | undefined;
    emoji?: string | null | undefined;
    id?: string | undefined;
    name: string;
  }) => {
    if (disabled || isSaving) return;
    const activeMatch =
      (tag.id ? activeTagMap.get(tag.id) : undefined) ??
      activeTagMap.get(tag.name.toLocaleLowerCase("pt-BR"));

    setIsSaving(true);
    try {
      if (activeMatch && onRemove) {
        await onRemove(activeMatch.id);
      } else if (!activeMatch) {
        await onAdd({
          ...(tag.color === undefined || tag.color === null
            ? {}
            : { color: tag.color }),
          ...(tag.emoji === undefined || tag.emoji === null
            ? {}
            : { emoji: tag.emoji }),
          name: tag.name,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="crm-tag-menu">
      <div className="crm-tag-menu-header">
        <span className="crm-tag-menu-title">
          <Tag className="size-3.5 text-primary" aria-hidden="true" />
          <span>Etiquetas da conversa</span>
        </span>
        {activeTags.length > 0 ? (
          <span className="crm-tag-menu-count">
            {activeTags.length}{" "}
            {activeTags.length === 1 ? "aplicada" : "aplicadas"}
          </span>
        ) : null}
      </div>

      <label className="crm-tag-search">
        <Morphicon
          active={Boolean(search)}
          aria-hidden="true"
          className="size-4 text-muted"
          name="search-close"
          size={16}
        />
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
            <Morphicon active aria-hidden="true" name="check-cross" size={14} />
          </button>
        ) : null}
      </label>

      {filteredTags.length > 0 ? (
        <div className="crm-tag-list" aria-label="Etiquetas">
          {filteredTags.map((tag) => {
            const assigned =
              activeTagMap.has(tag.id) ||
              activeTagMap.has(tag.name.toLocaleLowerCase("pt-BR"));
            const tagColor = tag.color ?? "var(--color-muted)";
            return (
              <button
                aria-pressed={assigned}
                className={`crm-tag-list-item${assigned ? " crm-tag-item-active" : ""}`}
                disabled={disabled || isSaving}
                key={tag.id}
                onClick={() => void handleToggleTag(tag)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`crm-tag-check${assigned ? " crm-tag-check-active" : ""}`}
                >
                  {assigned ? (
                    <Check className="size-3" aria-hidden="true" />
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className="crm-tag-color-dot"
                  style={{ backgroundColor: tagColor }}
                />
                <span className="crm-tag-item-label">
                  {tag.emoji ? (
                    <span className="crm-tag-item-emoji">{tag.emoji}</span>
                  ) : null}
                  <span className="crm-tag-item-name">{tag.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : search.trim() ? (
        <div className="crm-tag-empty-state">
          <p>Nenhuma etiqueta encontrada para &ldquo;{search}&rdquo;</p>
          <small>Crie uma nova etiqueta digitando abaixo</small>
        </div>
      ) : (
        <div className="crm-tag-preset-section">
          <span className="crm-tag-section-subtitle">Sugestões rápidas</span>
          <div className="crm-tag-presets">
            {DEFAULT_TAG_OPTIONS.map((tag) => {
              const assigned = activeTagMap.has(
                tag.name.toLocaleLowerCase("pt-BR"),
              );
              return (
                <button
                  aria-pressed={assigned}
                  className={`crm-tag-preset-chip${assigned ? " crm-tag-chip-active" : ""}`}
                  disabled={disabled || isSaving}
                  key={tag.name}
                  onClick={() => void handleToggleTag(tag)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="crm-tag-color-dot"
                    style={{
                      backgroundColor: tag.color ?? "var(--color-muted)",
                    }}
                  />
                  {tag.emoji ? <span>{tag.emoji}</span> : null}
                  <span>{tag.name}</span>
                  {assigned ? (
                    <Check className="size-2.5 ml-1 text-emerald-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form
        className="crm-tag-custom"
        onSubmit={(event) => {
          event.preventDefault();
          const name = customName.trim();
          if (!name) return;
          void handleToggleTag({ name });
          setCustomName("");
        }}
      >
        <div className="crm-tag-custom-input-wrap">
          <Tag className="size-3.5 crm-tag-custom-icon" aria-hidden="true" />
          <input
            disabled={disabled || isSaving}
            maxLength={40}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="Criar nova etiqueta..."
            value={customName}
          />
        </div>
        <button
          aria-label="Criar etiqueta"
          className="crm-tag-submit-btn"
          disabled={disabled || isSaving || !customName.trim()}
          title="Criar etiqueta"
          type="submit"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
