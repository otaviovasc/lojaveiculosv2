import { FileLock2, FilePenLine, Search } from "lucide-react";
import { useState } from "react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { kindLabel } from "./documentLabels";
import type { DocumentTemplate } from "./types";

export function DocumentBuilderSidebar({
  onSelect,
  selectedTemplateKey,
  templates,
}: {
  onSelect: (templateKey: string) => void;
  selectedTemplateKey: string | null;
  templates: readonly DocumentTemplate[];
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const visibleTemplates = normalizedSearch
    ? templates.filter((template) =>
        [template.title, template.description, kindLabel(template.kind)]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch),
      )
    : templates;

  return (
    <aside
      aria-label="Biblioteca de modelos"
      className="documents-builder-sidebar"
    >
      <div className="documents-builder-sidebar-header">
        <span>Biblioteca</span>
        <strong>{templates.length} modelos da loja</strong>
      </div>
      <label className="documents-builder-template-search">
        <span className="sr-only">Buscar modelos</span>
        <Search aria-hidden="true" className="size-4" />
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar modelo"
          type="search"
          value={search}
        />
      </label>
      <div className="documents-builder-template-list">
        {visibleTemplates.map((template) => {
          const isSelected = template.templateKey === selectedTemplateKey;
          const Icon = template.mode === "editable" ? FilePenLine : FileLock2;
          return (
            <button
              aria-pressed={isSelected}
              className="documents-builder-template-row"
              data-selected={isSelected}
              key={template.templateKey}
              onClick={() => onSelect(template.templateKey)}
              type="button"
            >
              <span className="documents-builder-template-icon">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="documents-builder-template-copy">
                <strong>{template.title}</strong>
                <small>{kindLabel(template.kind)}</small>
              </span>
              <FeatureStatusBadge
                className="documents-builder-template-mode"
                tone={template.mode === "editable" ? "success" : "neutral"}
              >
                {template.mode === "editable" ? "Editável" : "Travado"}
              </FeatureStatusBadge>
            </button>
          );
        })}
        {visibleTemplates.length === 0 ? (
          <p className="documents-builder-template-empty">
            Nenhum modelo corresponde à busca.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
