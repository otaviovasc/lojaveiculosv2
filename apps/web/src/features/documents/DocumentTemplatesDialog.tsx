import { X } from "lucide-react";
import { DocumentTemplatesPanel } from "./DocumentTemplatesPanel";
import { DocumentsDialogShell } from "./DocumentsDialogShell";
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
    <DocumentsDialogShell
      className="documents-templates-dialog"
      onClose={onClose}
      title="Modelos de documentos"
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
    </DocumentsDialogShell>
  );
}
