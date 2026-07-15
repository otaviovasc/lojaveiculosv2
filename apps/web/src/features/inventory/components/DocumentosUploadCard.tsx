import { useState } from "react";
import { Download, Eye, FileText, LoaderCircle, Upload } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import { documentKindOptions } from "../model/formModel";
import { uploadInventoryFile } from "../model/mediaWorkspaceTypes";
import type {
  InventoryDocumentKind,
  InventoryListingDetail,
  InventoryUnit,
} from "../model/types";
import { InventorySelect } from "./InventoryFormParts";

type Props = {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
  unit: InventoryUnit | null;
};

export function DocumentosUploadCard({ api, detail, onUpdated, unit }: Props) {
  const [kind, setKind] = useState<InventoryDocumentKind>(
    "vehicle_registration",
  );
  const [isUploading, setIsUploading] = useState(false);
  const [activeDocumentAction, setActiveDocumentAction] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const documents = unit
    ? detail.documents.filter((document) => document.targetId === unit.id)
    : [];

  async function uploadDocument(file: File) {
    if (!unit) return;
    const validationError = validateDocumentFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const upload = await api.requestUnitDocumentUpload(unit.id, {
        file,
        kind,
      });
      await uploadInventoryFile(file, upload);
      onUpdated(
        await api.attachUnitDocument(unit.id, {
          fileName: file.name,
          fileSizeBytes: file.size,
          kind,
          mimeType: file.type || "application/octet-stream",
          storageKey: upload.storageKey,
          title: file.name,
        }),
      );
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível enviar o documento."),
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function openDocument(
    documentId: string,
    disposition: "attachment" | "inline",
  ) {
    const actionKey = `${documentId}:${disposition}`;
    const previewWindow =
      disposition === "inline" ? openPendingPreviewWindow() : null;
    setActiveDocumentAction(actionKey);
    setError(null);
    try {
      const access = await api.getDocumentAccess(documentId, disposition);
      if (previewWindow) {
        previewWindow.location.replace(access.downloadUrl);
      } else {
        triggerDocumentLink(access.downloadUrl, {
          ...(disposition === "attachment"
            ? { fileName: access.fileName }
            : {}),
          newTab: disposition === "inline",
        });
      }
    } catch (caught) {
      previewWindow?.close();
      setError(
        formatApiErrorDisplay(
          caught,
          disposition === "inline"
            ? "Não foi possível abrir a prévia do documento."
            : "Não foi possível baixar o documento.",
        ),
      );
    } finally {
      setActiveDocumentAction(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Documentos anexados
          </h3>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-black text-accent-strong">
            {documents.length}
          </span>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <InventorySelect
            ariaLabel="Tipo do documento"
            className="min-h-9 w-full text-xs sm:w-auto"
            disabled={!unit || isUploading}
            onChange={(value) => setKind(value as InventoryDocumentKind)}
            options={documentKindOptions}
            value={kind}
          />
          <label
            className={
              "inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 text-xs font-black text-accent-foreground transition-colors sm:w-auto " +
              (!unit || isUploading
                ? "cursor-not-allowed opacity-55"
                : "cursor-pointer hover:bg-accent-strong")
            }
          >
            <Upload className="size-3.5 shrink-0" />
            <span>{isUploading ? "Enviando..." : "Enviar"}</span>
            <input
              accept="application/pdf,image/*"
              className="sr-only"
              disabled={!unit || isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadDocument(file);
              }}
              type="file"
            />
          </label>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}

      <p className="text-xs font-bold text-muted">
        Formatos aceitos: PDF e imagens, com até 25 MB por arquivo.
      </p>

      {!unit ? (
        <p className="rounded-xl border border-dashed border-line p-5 text-center text-xs font-bold text-muted">
          Selecione uma unidade física para anexar documentos.
        </p>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-app/10 py-10 text-center">
          <FileText className="size-5 text-muted" />
          <p className="text-xs font-black text-app-text">
            Nenhum documento anexado
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-2 rounded-xl border border-line bg-app/20 p-3 text-xs font-bold"
            >
              <FileText className="size-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-app-text">{document.title}</p>
                {document.fileName !== document.title ? (
                  <p className="truncate text-xs text-muted">
                    {document.fileName}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <DocumentActionButton
                  disabled={activeDocumentAction !== null}
                  icon={
                    activeDocumentAction === `${document.id}:inline`
                      ? LoaderCircle
                      : Eye
                  }
                  label="Pré-visualizar documento"
                  loading={activeDocumentAction === `${document.id}:inline`}
                  onClick={() => void openDocument(document.id, "inline")}
                />
                <DocumentActionButton
                  disabled={activeDocumentAction !== null}
                  icon={
                    activeDocumentAction === `${document.id}:attachment`
                      ? LoaderCircle
                      : Download
                  }
                  label="Baixar documento"
                  loading={activeDocumentAction === `${document.id}:attachment`}
                  onClick={() => void openDocument(document.id, "attachment")}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function openPendingPreviewWindow() {
  try {
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    return previewWindow;
  } catch {
    return null;
  }
}

function triggerDocumentLink(
  url: string,
  options: { fileName?: string; newTab: boolean },
) {
  const link = window.document.createElement("a");
  link.href = url;
  link.rel = "noopener noreferrer";
  if (options.newTab) link.target = "_blank";
  if (options.fileName) link.download = options.fileName;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
}

function DocumentActionButton({
  disabled,
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  disabled: boolean;
  icon: typeof Eye;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="border border-line bg-panel text-muted hover:border-accent/40 hover:bg-accent-soft hover:text-accent-strong"
          disabled={disabled}
          onClick={onClick}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Icon
            aria-hidden="true"
            className={loading ? "animate-spin" : undefined}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const maxDocumentFileBytes = 25 * 1024 * 1024;

function validateDocumentFile(file: File) {
  if (file.size === 0) return "O arquivo selecionado está vazio.";
  if (file.size > maxDocumentFileBytes) {
    return "O arquivo excede o limite de 25 MB.";
  }
  if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
    return "Envie um arquivo PDF ou uma imagem.";
  }
  return null;
}
