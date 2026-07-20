import {
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  InventoryInput,
  InventorySelect,
} from "../inventory/components/InventoryFormParts";
import { kindOptions } from "./documentLabels";
import type { DocumentKind } from "./types";

export type UploadQueueItem = {
  file: File;
  id: string;
  kind: DocumentKind;
  progress?: number;
  status?: "queued" | "uploading" | "done" | "error";
  title: string;
};

export function DocumentUploadQueue({
  isUploading,
  items,
  onClearAll,
  onRemove,
  onUpdate,
}: {
  isUploading: boolean;
  items: UploadQueueItem[];
  onClearAll: () => void;
  onRemove: (id: string) => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<UploadQueueItem, "kind" | "title">>,
  ) => void;
}) {
  if (items.length === 0) return null;

  const totalBytes = items.reduce((total, item) => total + item.file.size, 0);

  return (
    <section className="documents-upload-queue" aria-label="Fila de envio">
      <header className="documents-upload-queue-header">
        <div className="documents-upload-queue-summary">
          <strong>
            {items.length === 1
              ? `1 arquivo selecionado (${formatFileSize(totalBytes)})`
              : `${items.length} arquivos selecionados (${formatFileSize(totalBytes)})`}
          </strong>
          <span>Revise título e tipo antes de salvar.</span>
        </div>
        <button
          className="documents-upload-queue-clear"
          disabled={isUploading}
          onClick={onClearAll}
          type="button"
        >
          Limpar fila
        </button>
      </header>
      <div className="documents-upload-list">
        {items.map((item, index) => (
          <article className="documents-upload-item" key={item.id}>
            <span className="documents-upload-file-icon">
              {item.file.type.startsWith("image/") ? (
                <FileImage aria-hidden="true" className="size-4" />
              ) : (
                <FileText aria-hidden="true" className="size-4" />
              )}
            </span>
            <div className="documents-upload-item-main">
              <small>
                {item.file.name} · {formatFileSize(item.file.size)}
              </small>
              <label>
                <span>Título do documento</span>
                <InventoryInput
                  aria-label={`Título do arquivo ${item.file.name}`}
                  disabled={isUploading}
                  onChange={(event) =>
                    onUpdate(item.id, { title: event.target.value })
                  }
                  placeholder={`Documento ${index + 1}`}
                  value={item.title}
                />
              </label>
            </div>
            <label className="documents-upload-kind-field">
              <span>Tipo</span>
              <InventorySelect
                ariaLabel={`Tipo do arquivo ${item.file.name}`}
                disabled={isUploading}
                onChange={(kind) =>
                  onUpdate(item.id, {
                    kind,
                  })
                }
                options={kindOptions
                  .filter((option) => option.value)
                  .map((option) => ({
                    label: option.label,
                    value: option.value as DocumentKind,
                  }))}
                value={item.kind}
              />
            </label>
            <UploadItemStatus item={item} />
            <button
              aria-label={`Remover ${item.file.name}`}
              disabled={isUploading}
              onClick={() => onRemove(item.id)}
              title="Remover arquivo"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function UploadItemStatus({ item }: { item: UploadQueueItem }) {
  const status = item.status ?? "queued";
  if (status === "uploading") {
    return (
      <span className="documents-upload-item-status" data-status={status}>
        <Loader2 aria-hidden="true" className="size-4" />
        Enviando
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="documents-upload-item-status" data-status={status}>
        <CheckCircle2 aria-hidden="true" className="size-4" />
        Pronto
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="documents-upload-item-status" data-status={status}>
        Falhou
      </span>
    );
  }
  return <span className="documents-upload-item-status">Na fila</span>;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
