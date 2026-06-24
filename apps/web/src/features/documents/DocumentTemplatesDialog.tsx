import { X } from "lucide-react";
import { DocumentTemplatesPanel } from "./DocumentTemplatesPanel";
import type {
  DocumentKind,
  DocumentTemplate,
  UpdateDocumentTemplateInput,
} from "./types";

export function DocumentTemplatesDialog({
  isOpen,
  isSaving,
  onClose,
  onSave,
  templates,
}: {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (
    kind: DocumentKind,
    input: UpdateDocumentTemplateInput,
  ) => Promise<void>;
  templates: readonly DocumentTemplate[];
}) {
  if (!isOpen) return null;

  return (
    <div className="documents-modal-backdrop" onClick={onClose}>
      <section
        aria-label="Modelos de documentos"
        className="documents-templates-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="documents-upload-header">
          <div>
            <strong>Modelos de documentos</strong>
            <span>Revise e edite os modelos de documentos gerados.</span>
          </div>
          <button
            aria-label="Fechar modelos"
            className="documents-icon-button"
            onClick={onClose}
            title="Fechar modelos"
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>
        <DocumentTemplatesPanel
          isSaving={isSaving}
          onSave={onSave}
          templates={templates}
        />
      </section>
    </div>
  );
}
