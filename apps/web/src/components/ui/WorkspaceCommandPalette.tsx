import { ArrowUpRight, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { FeatureSearchField } from "./FeatureControls";
import { FeatureDialog } from "./FeatureOverlay";

export type WorkspaceCommandItem<Id extends string> = {
  group?: string;
  icon: ComponentType<{ className?: string }>;
  id: Id;
  shortcut?: string;
  title: string;
};

export function WorkspaceCommandPalette<Id extends string>({
  isOpen,
  items,
  onClose,
  onOpen,
  onSelect,
}: {
  isOpen: boolean;
  items: readonly WorkspaceCommandItem<Id>[];
  onClose: () => void;
  onOpen: () => void;
  onSelect: (id: Id) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      normalize(`${item.group ?? ""} ${item.title}`).includes(normalizedQuery),
    );
  }, [items, query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const opensWithShortcut =
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !isEditing);

      if (!opensWithShortcut) return;
      event.preventDefault();
      onOpen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  return (
    <FeatureDialog
      className="workspace-command"
      isOpen={isOpen}
      onClose={onClose}
      title="Ir para um módulo"
    >
      <FeatureSearchField
        autoFocus
        label="Buscar módulos"
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="Busque veículos, vendas, documentos..."
        value={query}
      />
      <div
        aria-label="Resultados da busca"
        className="workspace-command__results"
        role="listbox"
      >
        {results.length ? (
          results.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className="workspace-command__item"
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                role="option"
                type="button"
              >
                <span className="workspace-command__item-icon">
                  <Icon />
                </span>
                <span className="workspace-command__item-copy">
                  <strong>{item.title}</strong>
                  <small>{item.group ?? "Loja"}</small>
                </span>
                {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                <ArrowUpRight aria-hidden="true" />
              </button>
            );
          })
        ) : (
          <div className="workspace-command__empty">
            <Search aria-hidden="true" />
            <strong>Nenhum módulo encontrado</strong>
            <span>Tente um nome mais curto.</span>
          </div>
        )}
      </div>
    </FeatureDialog>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
