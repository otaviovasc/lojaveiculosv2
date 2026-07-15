import { FolderOpen, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { DocumentsApi } from "./apiClient";
import {
  DocumentUploadQueue,
  type UploadQueueItem,
} from "./DocumentUploadQueue";
import type { DocumentUpload, WorkspaceDocument } from "./types";
import { DocumentsDialogShell } from "./DocumentsDialogShell";

export type DocumentUploadTarget =
  | { label: string; mode: "general" }
  | {
      label: string;
      mode: "vehicle_unit";
      unitId: string;
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
  const canUpload =
    !isUploading &&
    items.length > 0 &&
    items.every((item) => item.title.trim().length > 0);

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
        progress: 0,
        status: "queued" as const,
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
      setStatus("Selecione ao menos um arquivo para envio.");
      return;
    }
    if (items.some((item) => !item.title.trim())) {
      setStatus("Todos os arquivos precisam de um título.");
      return;
    }

    setIsUploading(true);
    setStatus(null);
    setItems((current) =>
      current.map((item) => ({ ...item, progress: 0, status: "queued" })),
    );
    const uploaded: WorkspaceDocument[] = [];

    try {
      for (const [index, item] of items.entries()) {
        setStatus(
          `Enviando ${index + 1} de ${items.length}: ${item.file.name}`,
        );
        setProgress(Math.round((index / items.length) * 100));
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, progress: 10, status: "uploading" }
              : entry,
          ),
        );
        const upload =
          target.mode === "vehicle_unit"
            ? await api.requestUnitDocumentUpload(target.unitId, {
                contentType: item.file.type || "application/octet-stream",
                fileName: item.file.name,
                kind: item.kind,
                sizeBytes: item.file.size,
              })
            : await api.requestDocumentUpload({
                contentType: item.file.type || "application/octet-stream",
                fileName: item.file.name,
                sizeBytes: item.file.size,
              });
        await uploadDocumentObject(upload, item.file);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, progress: 75, status: "uploading" }
              : entry,
          ),
        );
        if (target.mode === "vehicle_unit") {
          uploaded.push(
            await api.createUnitUploadedDocument(target.unitId, {
              fileName: item.file.name,
              fileSizeBytes: item.file.size,
              kind: item.kind,
              mimeType: item.file.type || null,
              storageKey: upload.storageKey,
              title: item.title.trim(),
            }),
          );
        } else {
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
        }
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, progress: 100, status: "done" }
              : entry,
          ),
        );
        setProgress(Math.round(((index + 1) / items.length) * 100));
      }
      setStatus("Documentos salvos com sucesso.");
      onUploaded(uploaded);
      onClose();
    } catch (error) {
      setItems((current) =>
        current.map((item) =>
          item.status === "uploading" ? { ...item, status: "error" } : item,
        ),
      );
      setStatus(
        formatApiErrorDisplay(error, "Não foi possível enviar os documentos."),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DocumentsDialogShell
      animated
      canDismiss={!isUploading}
      className="glass-panel-branded documents-upload-dialog !p-6 relative overflow-hidden"
      onClose={onClose}
      title="Anexar documentos"
    >
      <header className="documents-upload-header">
        <div>
          <strong>Enviar documentos</strong>
          <span>Inclua arquivos, revise metadados e salve na pasta certa.</span>
        </div>
        <button
          aria-label="Fechar"
          className="inline-flex size-7 items-center justify-center rounded-full border border-line bg-app-elevated text-muted hover:text-primary transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          disabled={isUploading}
          onClick={onClose}
          title="Fechar"
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </header>

      <section
        aria-label="Destino selecionado"
        className="documents-upload-destination"
      >
        <FolderOpen aria-hidden="true" className="size-5" />
        <div>
          <span>Pasta de destino</span>
          <strong>{target.label}</strong>
        </div>
        <small>
          {target.mode === "vehicle_unit"
            ? "Vinculado à unidade do veículo"
            : "Documentos gerais da loja"}
        </small>
      </section>

      <label
        className="documents-upload-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (isUploading) return;
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          accept="application/pdf,image/*"
          disabled={isUploading}
          multiple
          aria-label="Selecionar documentos para envio"
          onChange={(event) => {
            addFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }}
          type="file"
        ></input>
        <Upload aria-hidden="true" className="size-7" />
        <strong>Selecione ou arraste arquivos</strong>
        <span>PDFs ou imagens. Pode enviar vários de uma vez.</span>
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
        <div className="documents-upload-progress-block">
          <div>
            <span>Progresso do envio</span>
            <strong>{progress}%</strong>
          </div>
          <progress
            aria-label="Progresso do envio"
            className="documents-upload-progress"
            value={progress}
            max={100}
          />
        </div>
      ) : null}

      <footer className="documents-upload-actions flex justify-end gap-3 mt-4">
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-app px-4 text-sm font-bold text-app-text hover:bg-app-elevated transition-all duration-200 hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50"
          disabled={isUploading}
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-accent-foreground cursor-pointer transition-all duration-200 hover:scale-102 active:scale-98 disabled:opacity-70"
          disabled={!canUpload}
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
    </DocumentsDialogShell>
  );
}

export async function readDocumentUploadResponse(
  response: Response,
): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `Falha no envio do documento para o armazenamento. Código HTTP ${response.status}.`,
    );
  }
}

export async function uploadDocumentObject(
  upload: DocumentUpload,
  file: File,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (isLocalMockUploadUrl(upload.uploadUrl)) return;
  await fetchImpl(upload.uploadUrl, {
    body: file,
    headers: upload.uploadHeaders,
    method: upload.uploadMethod,
  }).then(readDocumentUploadResponse);
}

function isLocalMockUploadUrl(uploadUrl: string) {
  try {
    const url = new URL(uploadUrl);
    return url.hostname === "upload.local";
  } catch {
    return false;
  }
}

function isAcceptedDocumentFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}
