import {
  Car,
  FileCheck,
  FileKey,
  FileLock2,
  FilePenLine,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Plus,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  FeatureStatusBadge,
  type FeatureStatusTone,
} from "../../components/ui/FeatureStates";
import { kindLabel } from "./documentLabels";
import type { DocumentKind, DocumentTemplate } from "./types";

type TemplateCategoryFilter = "all" | "custom" | "editable" | "locked";

function templateBadge(template: DocumentTemplate): {
  label: string;
  locked: boolean;
  tone: FeatureStatusTone;
} {
  if (template.source === "store") {
    return { label: "Personalizado", locked: false, tone: "success" };
  }
  if (template.mode === "editable") {
    return { label: "Editável", locked: false, tone: "blue" };
  }
  return { label: "Oficial", locked: true, tone: "neutral" };
}

function documentKindIcon(kind: DocumentKind, locked: boolean) {
  if (locked) return FileLock2;
  switch (kind) {
    case "sale_contract":
      return FileText;
    case "sale_receipt":
    case "finance_receipt":
    case "reservation_receipt":
      return Receipt;
    case "delivery_term":
    case "buyer_acknowledgment":
      return FileCheck;
    case "test_drive":
      return Car;
    case "power_of_attorney":
      return FileKey;
    case "inspection":
      return FileSpreadsheet;
    case "buyer_document":
    case "internal":
    case "invoice":
    case "other":
    case "vehicle_registration":
      return FilePenLine;
  }
}

export function DocumentBuilderSidebar({
  onOpenCreateTemplate,
  onSelect,
  selectedTemplateKey,
  templates,
}: {
  onOpenCreateTemplate?: () => void;
  onSelect: (templateKey: string) => void;
  selectedTemplateKey: string | null;
  templates: readonly DocumentTemplate[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<TemplateCategoryFilter>("all");

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (categoryFilter === "editable" && template.mode !== "editable") {
        return false;
      }
      if (categoryFilter === "custom" && template.source !== "store") {
        return false;
      }
      if (categoryFilter === "locked" && template.mode !== "locked") {
        return false;
      }

      if (!normalizedSearch) return true;
      return [template.title, template.description, kindLabel(template.kind)]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
    });
  }, [categoryFilter, normalizedSearch, templates]);

  const customCount = templates.filter((t) => t.source === "store").length;
  const editableCount = templates.filter((t) => t.mode === "editable").length;

  return (
    <aside
      aria-label="Biblioteca de modelos"
      className="documents-builder-sidebar"
    >
      <div className="documents-builder-sidebar-header flex flex-col gap-2">
        <div>
          <div>
            <span>Biblioteca</span>
            <strong>{templates.length} modelos disponíveis</strong>
          </div>
        </div>

        {/* Category Pills */}
        <div
          aria-label="Filtrar categoria de modelos"
          className="flex flex-wrap gap-1 pt-1"
          role="tablist"
        >
          <button
            aria-selected={categoryFilter === "all"}
            className="documents-builder-filter-pill"
            data-active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            role="tab"
            type="button"
          >
            Todos ({templates.length})
          </button>
          <button
            aria-selected={categoryFilter === "editable"}
            className="documents-builder-filter-pill"
            data-active={categoryFilter === "editable"}
            onClick={() => setCategoryFilter("editable")}
            role="tab"
            type="button"
          >
            Editáveis ({editableCount})
          </button>
          {customCount > 0 ? (
            <button
              aria-selected={categoryFilter === "custom"}
              className="documents-builder-filter-pill"
              data-active={categoryFilter === "custom"}
              onClick={() => setCategoryFilter("custom")}
              role="tab"
              type="button"
            >
              Personalizados ({customCount})
            </button>
          ) : null}
          <button
            aria-selected={categoryFilter === "locked"}
            className="documents-builder-filter-pill"
            data-active={categoryFilter === "locked"}
            onClick={() => setCategoryFilter("locked")}
            role="tab"
            type="button"
          >
            Oficiais
          </button>
        </div>
      </div>

      <label className="documents-builder-template-search relative">
        <span className="sr-only">Buscar modelos</span>
        <Search aria-hidden="true" className="size-4" />
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar modelo..."
          type="search"
          value={search}
        />
        {search ? (
          <button
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-app-text"
            onClick={() => setSearch("")}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </label>

      <div className="documents-builder-template-list">
        {filteredTemplates.map((template) => {
          const isSelected = template.templateKey === selectedTemplateKey;
          const badge = templateBadge(template);
          const Icon = documentKindIcon(template.kind, badge.locked);
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
                tone={badge.tone}
              >
                {badge.label}
              </FeatureStatusBadge>
            </button>
          );
        })}
        {filteredTemplates.length === 0 ? (
          <div className="documents-builder-template-empty p-4 text-center">
            <p className="text-xs text-muted">
              Nenhum modelo corresponde aos filtros.
            </p>
            {onOpenCreateTemplate ? (
              <button
                className="mt-2 text-xs font-bold text-accent-strong hover:underline inline-flex items-center gap-1 cursor-pointer"
                onClick={onOpenCreateTemplate}
                type="button"
              >
                <FilePlus2 className="size-3.5" />
                Criar modelo personalizado
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {onOpenCreateTemplate ? (
        <div className="documents-builder-sidebar-footer">
          <button
            className="documents-builder-sidebar-create-btn inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-app px-2.5 py-1.5 text-xs font-bold text-app-text transition hover:border-line-strong hover:bg-app-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            onClick={onOpenCreateTemplate}
            title="Criar novo modelo"
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            <span>Novo modelo</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
