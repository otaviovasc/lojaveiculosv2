import type { ReactNode } from "react";
import type { InventoryListingDetail, InventoryMediaUpload } from "./types";

export type InventoryMediaState =
  | { kind: "idle" }
  | { kind: "busy"; label: string }
  | { kind: "error"; message: string };

export type InventoryMediaRun = (
  label: string,
  action: () => Promise<InventoryListingDetail>,
) => Promise<void>;

export type IconActionProps = {
  children: ReactNode;
  label: string;
  onClick: () => void;
};

export async function uploadInventoryFile(
  file: File,
  upload: InventoryMediaUpload,
) {
  const response = await fetch(upload.uploadUrl, {
    body: file,
    headers: upload.uploadHeaders,
    method: upload.uploadMethod,
  });

  if (!response.ok) {
    throw new Error(
      `Falha no upload da imagem para o armazenamento. Codigo HTTP ${response.status}.`,
    );
  }
}
