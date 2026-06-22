import { Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DocumentsApi } from "./apiClient";
import {
  DocumentUploadQueue,
  type UploadQueueItem,
} from "./DocumentUploadQueue";
import type { DocumentLinkTarget, WorkspaceDocument } from "./types";

export type DocumentUploadTarget = {
  label: string;
  targetId?: string;
  targetType?: DocumentLinkTarget;
};

export function DocumentUploadDialog({
  api,
  isOpen,
  onClose,
  onUploaded,
  target,
}: {
  api: DocumentsApi;
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (documents: WorkspaceDocument[]) => void;
  target: DocumentUploadTarget;
}) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setStatus(null);
      setProgress(0);
      setIsUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addFiles = (files: File[]) => {
    const accepted = files.filter(isAcceptedDocumentFile);
    if (accepted.length !== files.length) {
      setStatus(
        "Alguns arquivos foram ignorados. Envie apenas PDFs ou imagens.",
      );
    }
    setItems((current) => [
      ...current,
      ...accepted.map((file) => ({
        file,
        id: `${file.name}:${file.size}:${file.lastModified}:${crypto.randomUUID()}`,
        kind: "other" as const,
        title: file.name,
      })),
    ]);
  };

  const updateItem = (
    id: string,
    updates: Partial<Pick<UploadQueueItem, "kind" | "title">>,
  ) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const uploadDocuments = async () => {
    if (items.length === 0) {
      setStatus("Selecione ao menos um arquivo para upload.");
      return;
    }
    if (items.some((item) => !item.title.trim())) {
      setStatus("Todos os arquivos precisam de um titulo.");
      return;
    }

    setIsUploading(true);
    setStatus(null);
    const uploaded: WorkspaceDocument[] = [];

    try {
      for (const [index, item] of items.entries()) {
        setStatus(`${index + 1}/${items.length} - ${item.file.name}`);
        setProgress(Math.round((index / items.length) * 100));
        const upload = await api.requestDocumentUpload({
          contentType: item.file.type || "application/octet-stream",
          fileName: item.file.name,
          sizeBytes: item.file.size,
        });
        await fetch(upload.uploadUrl, {
          body: item.file,
          headers: upload.uploadHeaders,
          method: upload.uploadMethod,
        }).then(readDocumentUploadResponse);
        uploaded.push(
          await api.createUploadedDocument({
            fileName: item.file.name,
            fileSizeBytes: item.file.size,
            kind: item.kind,
            mimeType: item.file.type || null,
            storageKey: upload.storageKey,
            title: item.title.trim(),
          }),
        );
        setProgress(Math.round(((index + 1) / items.length) * 100));
      }
      onUploaded(uploaded);
      onClose();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="documents-modal-backdrop"
      onClick={isUploading ? undefined : onClose}
    >
      <section
        aria-label="Anexar documentos"
        className="documents-upload-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="documents-upload-header">
          <div>
            <strong>Anexar documentos</strong>
            <span>{target.label}</span>
          </div>
          <button
            aria-label="Fechar"
            disabled={isUploading}
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <label
          className="documents-upload-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <input
            accept="application/pdf,image/*"
            disabled={isUploading}
            multiple
            onChange={(event) => {
              addFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
            type="file"
          />
          <Upload aria-hidden="true" className="size-7" />
          <strong>Selecione ou arraste arquivos</strong>
          <span>PDFs ou imagens. Pode enviar varios de uma vez.</span>
        </label>

        <DocumentUploadQueue
          isUploading={isUploading}
          items={items}
          onRemove={(id) =>
            setItems((current) => current.filter((entry) => entry.id !== id))
          }
          onUpdate={updateItem}
        />

        {status ? <p className="documents-upload-status">{status}</p> : null}
        {isUploading ? (
          <progress
            className="documents-upload-progress"
            value={progress}
            max={100}
          />
        ) : null}

        <footer className="documents-upload-actions">
          <button disabled={isUploading} onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            disabled={isUploading}
            onClick={() => {
              void uploadDocuments();
            }}
            type="button"
          >
            {isUploading
              ? "Anexando..."
              : items.length <= 1
                ? "Salvar documento"
                : `Salvar ${items.length} documentos`}
          </button>
        </footer>
      </section>
    </div>
  );
}

export async function readDocumentUploadResponse(
  response: Response,
): Promise<void> {
  if (!response.ok) {
    throw new Error(`Document upload failed with status ${response.status}`);
  }
}

function isAcceptedDocumentFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}
