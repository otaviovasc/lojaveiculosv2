import { useState } from "react";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { kindOptions } from "./documentLabels";
import { DocumentRowActions } from "./DocumentWorkspaceRowActions";
import {
  documentContextLabel,
  documentFileLabel,
  documentKindBadge,
  documentPrimaryParty,
  documentStatusBadge,
  formatDateTime,
} from "./documentsWorkspaceModel";
import type { DocumentKind, WorkspaceDocument } from "./types";

export function DocumentsTable({
  documents,
  isBusy,
  onDelete,
  onDownload,
  onSelect,
  onUpdate,
}: {
  documents: readonly WorkspaceDocument[];
  isBusy: boolean;
  onDelete: (document: WorkspaceDocument) => void;
  onDownload: (documentId: string) => Promise<void>;
  onSelect: (document: WorkspaceDocument) => void;
  onUpdate: (
    document: WorkspaceDocument,
    input: { kind: DocumentKind; title: string },
  ) => Promise<void>;
}) {
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editKind, setEditKind] = useState<DocumentKind>("other");
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);

  if (documents.length === 0) {
    return <p className="documents-empty">Nenhum documento encontrado.</p>;
  }

  const startEditing = (document: WorkspaceDocument) => {
    setEditingDocumentId(document.id);
    setEditTitle(document.title);
    setEditKind(document.kind);
  };

  const cancelEditing = () => {
    setEditingDocumentId(null);
    setEditTitle("");
    setEditKind("other");
  };

  const saveEditing = async (document: WorkspaceDocument) => {
    setSavingDocumentId(document.id);
    try {
      await onUpdate(document, { kind: editKind, title: editTitle.trim() });
      cancelEditing();
    } finally {
      setSavingDocumentId(null);
    }
  };

  return (
    <div className="documents-table documents-rich-table">
      {documents.map((document) => {
        const isEditing = editingDocumentId === document.id;
        return (
          <article className="documents-row" key={document.id}>
            {isEditing ? (
              <DocumentRowEditor
                kind={editKind}
                onKindChange={setEditKind}
                onTitleChange={setEditTitle}
                title={editTitle}
              />
            ) : (
              <DocumentRowReadOnly document={document} onSelect={onSelect} />
            )}
            <DocumentRowActions
              document={document}
              isBusy={isBusy}
              isEditing={isEditing}
              isSaving={savingDocumentId === document.id}
              onCancel={cancelEditing}
              onDelete={onDelete}
              onDownload={onDownload}
              onEdit={startEditing}
              onSave={saveEditing}
              onSelect={onSelect}
            />
          </article>
        );
      })}
    </div>
  );
}

function DocumentRowEditor({
  kind,
  onKindChange,
  onTitleChange,
  title,
}: {
  kind: DocumentKind;
  onKindChange: (kind: DocumentKind) => void;
  onTitleChange: (title: string) => void;
  title: string;
}) {
  return (
    <div className="documents-row-editor">
      <input
        onChange={(event) => onTitleChange(event.target.value)}
        value={title}
      />
      <CustomSelect
        onChange={onKindChange}
        options={kindOptions
          .filter((option) => option.value)
          .map((option) => ({
            label: option.label,
            value: option.value as DocumentKind,
          }))}
        value={kind}
      />
    </div>
  );
}

function DocumentRowReadOnly({
  document,
  onSelect,
}: {
  document: WorkspaceDocument;
  onSelect: (document: WorkspaceDocument) => void;
}) {
  return (
    <button
      className="documents-row-main"
      onClick={() => onSelect(document)}
      type="button"
    >
      <div>
        <strong>{document.title}</strong>
        <small>{document.file.fileName}</small>
      </div>
      <span>{documentKindBadge(document)}</span>
      <span className={`documents-status status-${document.status}`}>
        {documentStatusBadge(document)}
      </span>
      <span>{documentContextLabel(document)}</span>
      <span>{documentPrimaryParty(document)}</span>
      <time dateTime={document.uploadedAt}>
        {formatDateTime(document.uploadedAt)}
      </time>
      <span>{documentFileLabel(document)}</span>
    </button>
  );
}
