import { FileImage, FileText, Trash2 } from "lucide-react";
import { kindOptions } from "./documentLabels";
import type { DocumentKind } from "./types";

export type UploadQueueItem = {
  file: File;
  id: string;
  kind: DocumentKind;
  title: string;
};

export function DocumentUploadQueue({
  isUploading,
  items,
  onRemove,
  onUpdate,
}: {
  isUploading: boolean;
  items: UploadQueueItem[];
  onRemove: (id: string) => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<UploadQueueItem, "kind" | "title">>,
  ) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="documents-upload-queue">
      {items.map((item) => (
        <article className="documents-upload-item" key={item.id}>
          {item.file.type.startsWith("image/") ? (
            <FileImage aria-hidden="true" className="size-4" />
          ) : (
            <FileText aria-hidden="true" className="size-4" />
          )}
          <div>
            <small>
              {item.file.name} · {formatFileSize(item.file.size)}
            </small>
            <input
              disabled={isUploading}
              onChange={(event) =>
                onUpdate(item.id, { title: event.target.value })
              }
              value={item.title}
            />
          </div>
          <select
            disabled={isUploading}
            onChange={(event) =>
              onUpdate(item.id, {
                kind: event.target.value as DocumentKind,
              })
            }
            value={item.kind}
          >
            {kindOptions
              .filter((option) => option.value)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
          <button
            aria-label="Remover arquivo"
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
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
