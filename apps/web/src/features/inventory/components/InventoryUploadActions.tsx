import { FilePlus2, ImageUp } from "lucide-react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import { documentKindOptions } from "../model/formModel";
import { InventorySelect } from "./InventoryFormParts";
import type {
  InventoryDocumentKind,
  InventoryListingDetail,
  InventoryMediaKind,
} from "../model/types";
import {
  uploadInventoryFile,
  type InventoryMediaRun,
} from "../model/mediaWorkspaceTypes";

export function InventoryUploadActions({
  api,
  detail,
  media,
  run,
  unitId,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  media: InventoryListingDetail["media"];
  run: InventoryMediaRun;
  unitId: string;
}) {
  const [documentKind, setDocumentKind] = useState<InventoryDocumentKind>(
    "vehicle_registration",
  );

  const [dragOverPublic, setDragOverPublic] = useState(false);
  const [dragOverInternal, setDragOverInternal] = useState(false);
  const [dragOverDocument, setDragOverDocument] = useState(false);

  const handleUploadPublic = (file: File) => {
    void run("Enviando mídia", async () => {
      const listingId = detail.listing.id;
      if (!unitId) throw new Error("Selecione uma unidade para anexar mídia.");
      const kind = inferPublicMediaKind(file);
      if (!kind) throw new Error("Envie uma imagem ou vídeo para a galeria.");
      const upload = await api.requestMediaUpload(unitId, {
        file,
        kind,
      });
      await uploadInventoryFile(file, upload);
      await api.createMedia(unitId, {
        altText: file.name,
        displayOrder: media.length,
        kind,
        storageKey: upload.storageKey,
      });
      return api.getListing(listingId);
    });
  };

  const handleUploadInternal = (file: File) => {
    void run("Anexando registro interno", async () => {
      if (!unitId) {
        throw new Error("Selecione uma unidade para anexar registro interno.");
      }
      const upload = await api.requestMediaUpload(unitId, {
        file,
        kind: "document_preview",
      });
      await uploadInventoryFile(file, upload);
      const mediaRecord = await api.createMedia(unitId, {
        altText: file.name,
        displayOrder: media.length,
        kind: "document_preview",
        storageKey: upload.storageKey,
      });
      return api.updateMedia(unitId, mediaRecord.mediaId, { isPublic: false });
    });
  };

  const handleUploadDocument = (file: File) => {
    void run("Anexando documento", async () => {
      if (!unitId) {
        throw new Error("Selecione uma unidade para anexar documento.");
      }
      const upload = await api.requestUnitDocumentUpload(unitId, {
        file,
        kind: documentKind,
      });
      await uploadInventoryFile(file, upload);
      return api.attachUnitDocument(unitId, {
        fileName: file.name,
        fileSizeBytes: file.size,
        kind: documentKind,
        mimeType: file.type || null,
        storageKey: upload.storageKey,
        title: file.name,
      });
    });
  };

  const onPublicFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (file) handleUploadPublic(file);
  };

  const onInternalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (file) handleUploadInternal(file);
  };

  const onDocumentFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (file) handleUploadDocument(file);
  };

  const handleDrag = (
    e: React.DragEvent,
    active: boolean,
    setter: (val: boolean) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setter(active);
  };

  const handleDrop = (
    e: React.DragEvent,
    setter: (val: boolean) => void,
    uploadFn: (file: File) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setter(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFn(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="grid gap-4 rounded-xl border border-line bg-app/35 p-4 md:grid-cols-3">
      {/* Card 1: Galeria Pública */}
      <div
        onDragEnter={(e) => handleDrag(e, true, setDragOverPublic)}
        onDragOver={(e) => handleDrag(e, true, setDragOverPublic)}
        onDragLeave={(e) => handleDrag(e, false, setDragOverPublic)}
        onDrop={(e) => handleDrop(e, setDragOverPublic, handleUploadPublic)}
        className={
          "relative flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-all duration-200 cursor-pointer group min-h-[170px] " +
          (dragOverPublic
            ? "border-accent bg-accent-soft/10 shadow-[0_0_12px_rgba(225,31,38,0.15)]"
            : "border-line bg-panel/30 hover:border-line-strong hover:bg-panel/50")
        }
      >
        <label className="flex size-full flex-col items-center justify-center cursor-pointer">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-strong transition-transform duration-300 group-hover:scale-110">
            <ImageUp className="size-5" />
          </div>
          <span className="mt-3 block text-sm font-black text-app-text">
            Galeria Pública
          </span>
          <span className="mt-1 block text-xs font-bold text-muted">
            Fotos ou vídeos (imagem/vídeo)
          </span>
          <span className="mt-2 text-xs font-black uppercase tracking-wider text-accent">
            Arraste ou clique para buscar
          </span>
          <input
            accept="image/*,video/*"
            className="sr-only"
            type="file"
            onChange={onPublicFileChange}
          />
        </label>
      </div>

      {/* Card 2: Registro Interno */}
      <div
        onDragEnter={(e) => handleDrag(e, true, setDragOverInternal)}
        onDragOver={(e) => handleDrag(e, true, setDragOverInternal)}
        onDragLeave={(e) => handleDrag(e, false, setDragOverInternal)}
        onDrop={(e) => handleDrop(e, setDragOverInternal, handleUploadInternal)}
        className={
          "relative flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-all duration-200 cursor-pointer group min-h-[170px] " +
          (dragOverInternal
            ? "border-blue-start bg-blue-soft/15 shadow-[0_0_12px_rgba(30,144,255,0.15)]"
            : "border-line bg-panel/30 hover:border-line-strong hover:bg-panel/50")
        }
      >
        <label className="flex size-full flex-col items-center justify-center cursor-pointer">
          <div className="flex size-12 items-center justify-center rounded-full bg-blue-soft text-blue-start transition-transform duration-300 group-hover:scale-110">
            <FilePlus2 className="size-5" />
          </div>
          <span className="mt-3 block text-sm font-black text-app-text">
            Registro Interno
          </span>
          <span className="mt-1 block text-xs font-bold text-muted">
            Laudos, vistorias ou fotos de reparos
          </span>
          <span className="mt-2 text-xs font-black uppercase tracking-wider text-blue-start">
            Arraste ou clique para buscar
          </span>
          <input
            accept="image/*,application/pdf"
            className="sr-only"
            type="file"
            onChange={onInternalFileChange}
          />
        </label>
      </div>

      {/* Card 3: Documento Operacional */}
      <div
        onDragEnter={(e) => handleDrag(e, true, setDragOverDocument)}
        onDragOver={(e) => handleDrag(e, true, setDragOverDocument)}
        onDragLeave={(e) => handleDrag(e, false, setDragOverDocument)}
        onDrop={(e) => handleDrop(e, setDragOverDocument, handleUploadDocument)}
        className={
          "relative flex flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-all duration-200 cursor-pointer group min-h-[170px] " +
          (dragOverDocument
            ? "border-amber-500 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            : "border-line bg-panel/30 hover:border-line-strong hover:bg-panel/50")
        }
      >
        <div className="flex size-full flex-col items-center justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 transition-transform duration-300 group-hover:scale-110">
            <FilePlus2 className="size-5" />
          </div>

          <span className="mt-2.5 block text-sm font-black text-app-text">
            Documento Operacional
          </span>

          {/* Select Component embedded nicely, click stops propagation to avoid triggering file search */}
          <div
            className="mt-2 w-full max-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <DocumentSelect value={documentKind} onChange={setDocumentKind} />
          </div>

          <label className="mt-2 flex w-full flex-col items-center justify-center cursor-pointer">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              Arraste ou clique para buscar
            </span>
            <input
              accept="application/pdf,image/*,.doc,.docx"
              className="sr-only"
              type="file"
              onChange={onDocumentFileChange}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function DocumentSelect({
  onChange,
  value,
}: {
  onChange: (value: InventoryDocumentKind) => void;
  value: InventoryDocumentKind;
}) {
  return (
    <InventorySelect
      value={value}
      onChange={onChange}
      options={documentKindOptions}
    />
  );
}

function takeFile(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0] ?? null;
  event.target.value = "";
  return file;
}

function inferPublicMediaKind(file: File): InventoryMediaKind | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  return null;
}
