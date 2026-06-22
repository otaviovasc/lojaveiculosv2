import {
  Download,
  Edit3,
  FileSearch,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import type { WorkspaceDocument } from "./types";

export function DocumentRowActions({
  document,
  isBusy,
  isEditing,
  isSaving,
  onCancel,
  onDelete,
  onDownload,
  onEdit,
  onSave,
  onSelect,
}: {
  document: WorkspaceDocument;
  isBusy: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (document: WorkspaceDocument) => void;
  onDownload: (documentId: string) => Promise<void>;
  onEdit: (document: WorkspaceDocument) => void;
  onSave: (document: WorkspaceDocument) => Promise<void>;
  onSelect: (document: WorkspaceDocument) => void;
}) {
  if (isEditing) {
    return (
      <div className="documents-row-actions">
        <button
          disabled={isBusy || isSaving}
          onClick={() => void onSave(document)}
          title="Salvar"
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
        </button>
        <button
          disabled={isBusy || isSaving}
          onClick={onCancel}
          title="Cancelar"
          type="button"
        >
          <XCircle aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="documents-row-actions">
      <button
        disabled={isBusy}
        onClick={() => onSelect(document)}
        title="Visualizar"
        type="button"
      >
        <FileSearch aria-hidden="true" className="size-4" />
      </button>
      <button
        disabled={isBusy}
        onClick={() => void onDownload(document.id)}
        title="Baixar"
        type="button"
      >
        <Download aria-hidden="true" className="size-4" />
      </button>
      <button
        disabled={isBusy || document.status === "voided"}
        onClick={() => onEdit(document)}
        title="Editar titulo e tipo"
        type="button"
      >
        <Edit3 aria-hidden="true" className="size-4" />
      </button>
      <button
        disabled={isBusy || document.status === "voided"}
        onClick={() => onDelete(document)}
        title="Excluir documento"
        type="button"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
