import { FileLock2, FilePenLine } from "lucide-react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { kindLabel } from "./documentLabels";
import { templateKindLabel } from "./documentBuilderModel";
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
  return (
    <aside className="documents-builder-sidebar">
      <div className="documents-builder-sidebar-header">
        <span>Biblioteca</span>
        <strong>{templates.length} modelos migrados</strong>
      </div>
      <div className="documents-builder-template-list">
        {templates.map((template) => {
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
                <small>
                  {templateKindLabel(template.kind)} ·{" "}
                  {kindLabel(template.kind)}
                </small>
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
      </div>
    </aside>
  );
}
