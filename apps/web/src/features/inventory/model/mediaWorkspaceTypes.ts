import type { ReactNode } from "react";
import { uploadObjectToStorage } from "../../../lib/objectUpload";
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
  await uploadObjectToStorage(upload, file, {
    failureMessage: "Falha no upload da imagem para o armazenamento.",
  });
}
