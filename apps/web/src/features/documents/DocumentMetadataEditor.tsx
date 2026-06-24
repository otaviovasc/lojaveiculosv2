import { Save, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  InventoryInput,
  InventorySelect,
} from "../inventory/components/InventoryFormParts";
import { kindOptions } from "./documentLabels";
import type { DocumentKind, WorkspaceDocument } from "./types";

export function DocumentMetadataEditor({
  document,
  isBusy,
  onCancel,
  onSaved,
  onUpdate,
}: {
  document: WorkspaceDocument;
  isBusy: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onUpdate: (
    document: WorkspaceDocument,
    input: { kind: DocumentKind; title: string },
  ) => Promise<WorkspaceDocument | null>;
}) {
  const [editTitle, setEditTitle] = useState(document.title);
  const [editKind, setEditKind] = useState<DocumentKind>(document.kind);

  useEffect(() => {
    setEditTitle(document.title);
    setEditKind(document.kind);
  }, [document.id, document.kind, document.title]);

  const saveMetadata = async () => {
    const updated = await onUpdate(document, {
      kind: editKind,
      title: editTitle.trim(),
    });
    if (updated) onSaved();
  };

  return (
    <section
      aria-label="Editar metadados do documento"
      className="documents-detail-edit"
    >
      <label className="documents-filter-field">
        <span>Título</span>
        <InventoryInput
          disabled={isBusy}
          onChange={(event) => setEditTitle(event.target.value)}
          value={editTitle}
        />
      </label>
      <label className="documents-filter-field">
        <span>Tipo</span>
        <InventorySelect
          ariaLabel="Tipo de documento"
          disabled={isBusy}
          onChange={setEditKind}
          options={kindOptions
            .filter((option) => option.value)
            .map((option) => ({
              label: option.label,
              value: option.value as DocumentKind,
            }))}
          value={editKind}
        />
      </label>
      <div className="documents-detail-edit-actions">
        <button
          disabled={isBusy || !editTitle.trim()}
          onClick={() => void saveMetadata()}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          Salvar
        </button>
        <button disabled={isBusy} onClick={onCancel} type="button">
          <XCircle aria-hidden="true" className="size-4" />
          Cancelar
        </button>
      </div>
    </section>
  );
}
