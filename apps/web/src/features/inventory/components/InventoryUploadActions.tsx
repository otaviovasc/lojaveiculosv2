import { FilePlus2, ImageUp } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import { documentKindOptions, mediaKindOptions } from "../model/formModel";
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
  const [mediaKind, setMediaKind] = useState<InventoryMediaKind>("photo");
  const [documentKind, setDocumentKind] = useState<InventoryDocumentKind>(
    "vehicle_registration",
  );

  const uploadMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (!file) return;
    void run("Enviando midia", async () => {
      const listingId = detail.listing.id;
      if (!unitId) throw new Error("Selecione uma unidade para anexar midia.");
      const upload = await api.requestMediaUpload(unitId, {
        file,
        kind: mediaKind,
      });
      await uploadInventoryFile(file, upload);
      await api.createMedia(unitId, {
        altText: file.name,
        displayOrder: media.length,
        kind: mediaKind,
        storageKey: upload.storageKey,
      });
      return api.getListing(listingId);
    });
  };

  const uploadDocument = (event: ChangeEvent<HTMLInputElement>) => {
    const file = takeFile(event);
    if (!file) return;
    void run("Anexando documento", async () => {
      const listingId = detail.listing.id;
      const upload = await api.requestDocumentUpload(listingId, { file });
      await uploadInventoryFile(file, upload);
      return api.attachDocument(listingId, {
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
    <div className="grid gap-3 rounded-lg border border-line bg-app p-3 md:grid-cols-2">
      <InventoryField label="Galeria publica">
        <UploadSelect value={mediaKind} onChange={setMediaKind} />
        <FileButton
          icon={<ImageUp className="size-4" />}
          onChange={uploadMedia}
        />
      </InventoryField>
      <InventoryField label="Documento operacional">
        <DocumentSelect value={documentKind} onChange={setDocumentKind} />
        <FileButton
          icon={<FilePlus2 className="size-4" />}
          onChange={uploadDocument}
        />
      </InventoryField>
    </div>
  );
}

function UploadSelect({
  onChange,
  value,
}: {
  onChange: (value: InventoryMediaKind) => void;
  value: InventoryMediaKind;
}) {
  return (
    <div className="flex min-w-0 gap-2">
      <InventorySelect
        value={value}
        onChange={onChange}
        options={mediaKindOptions}
      />
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
  icon,
  onChange,
}: {
  icon: ReactNode;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="icon-button mt-2 grid min-w-11 cursor-pointer place-items-center">
      {icon}
      <input className="sr-only" type="file" onChange={onChange} />
    </label>
  );
}

function takeFile(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0] ?? null;
  event.target.value = "";
  return file;
}
