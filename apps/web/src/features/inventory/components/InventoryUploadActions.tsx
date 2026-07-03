import { FilePlus2, ImageUp } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import { documentKindOptions } from "../model/formModel";
import { InventoryField, InventorySelect } from "./InventoryFormParts";
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

  const uploadPublicMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (!file) return;
    void run("Enviando midia", async () => {
      const listingId = detail.listing.id;
      if (!unitId) throw new Error("Selecione uma unidade para anexar midia.");
      const kind = inferPublicMediaKind(file);
      if (!kind) throw new Error("Envie uma imagem ou video para a galeria.");
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

  const uploadInternalRecord = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (!file) return;
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

  const uploadDocument = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (!file) return;
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

  return (
    <div className="grid gap-3 rounded-lg border border-line bg-app p-3 lg:grid-cols-3">
      <InventoryField label="Galeria pública">
        <FileButton
          accept="image/*,video/*"
          icon={<ImageUp className="size-4" />}
          onChange={uploadPublicMedia}
        />
      </InventoryField>
      <InventoryField label="Registro interno">
        <FileButton
          accept="image/*,application/pdf"
          icon={<FilePlus2 className="size-4" />}
          onChange={uploadInternalRecord}
        />
      </InventoryField>
      <InventoryField label="Documento operacional">
        <DocumentSelect value={documentKind} onChange={setDocumentKind} />
        <FileButton
          accept="application/pdf,image/*,.doc,.docx"
          icon={<FilePlus2 className="size-4" />}
          onChange={uploadDocument}
        />
      </InventoryField>
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
    <div className="flex min-w-0 gap-2">
      <InventorySelect
        value={value}
        onChange={onChange}
        options={documentKindOptions}
      />
    </div>
  );
}

function FileButton({
  accept,
  icon,
  onChange,
}: {
  accept: string;
  icon: ReactNode;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="icon-button mt-2 grid min-w-11 cursor-pointer place-items-center">
      {icon}
      <input
        accept={accept}
        className="sr-only"
        type="file"
        onChange={onChange}
      />
    </label>
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
