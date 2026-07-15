import { FilePenLine, Files } from "lucide-react";

export type DocumentsSection = "documents" | "templates";

export function DocumentsSectionNavigation({
  activeSection,
  onOpenDocuments,
  onOpenTemplates,
  templateCount,
}: {
  activeSection: DocumentsSection;
  onOpenDocuments: () => void;
  onOpenTemplates: () => void;
  templateCount: number;
}) {
  return (
    <nav
      aria-label="Seções de documentos"
      className="documents-section-navigation"
    >
      <button
        aria-current={activeSection === "documents" ? "page" : undefined}
        data-active={activeSection === "documents"}
        onClick={onOpenDocuments}
        type="button"
      >
        <span className="documents-section-navigation-icon">
          <Files aria-hidden="true" className="size-4" />
        </span>
        <span className="documents-section-navigation-copy">
          <strong>Documentos</strong>
          <small>Arquivos emitidos e enviados</small>
        </span>
      </button>

      <button
        aria-current={activeSection === "templates" ? "page" : undefined}
        data-active={activeSection === "templates"}
        onClick={onOpenTemplates}
        type="button"
      >
        <span className="documents-section-navigation-icon">
          <FilePenLine aria-hidden="true" className="size-4" />
        </span>
        <span className="documents-section-navigation-copy">
          <strong>Modelos</strong>
          <small>Textos usados nas emissões</small>
        </span>
        <span className="documents-section-navigation-count">
          {templateCount}
        </span>
      </button>
    </nav>
  );
}
