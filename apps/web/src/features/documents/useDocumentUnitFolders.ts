import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInventoryApi,
  type InventoryApi,
} from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import {
  buildDocumentVehicleOptions,
  type DocumentVehicleOption,
} from "./documentDisplayModel";
import {
  inventorySummariesToUnitFolderOptions,
  mergeUnitFolderOptions,
} from "./documentUnitFolderOptions";
import type { WorkspaceDocument } from "./types";

const folderPageSize = 100;
const maxFolderPages = 20;

export type DocumentUnitFolderStatus = "idle" | "loading" | "ready" | "error";

export function useDocumentUnitFolders(
  documents: readonly WorkspaceDocument[],
  inventoryApi?: InventoryApi,
) {
  const [runtimeApi, setRuntimeApi] = useState<InventoryApi | null>(
    inventoryApi ?? null,
  );
  const [inventoryOptions, setInventoryOptions] = useState<
    DocumentVehicleOption[]
  >([]);
  const [status, setStatus] = useState<DocumentUnitFolderStatus>("idle");

  useEffect(() => {
    if (inventoryApi) {
      setRuntimeApi(inventoryApi);
    } else {
      void createInventoryApiOptions().then((opts) =>
        setRuntimeApi(createInventoryApi(opts)),
      );
    }
  }, [inventoryApi]);

  const reload = useCallback(async () => {
    if (!runtimeApi) return;
    setStatus("loading");
    try {
      const options: DocumentVehicleOption[] = [];
      let offset = 0;
      for (let page = 0; page < maxFolderPages; page += 1) {
        const result = await runtimeApi.listListings({
          limit: folderPageSize,
          offset,
        });
        options.push(...inventorySummariesToUnitFolderOptions(result.items));
        if (!result.hasMore || result.nextOffset == null) break;
        offset = result.nextOffset;
      }
      setInventoryOptions(options);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [runtimeApi]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const documentOptions = useMemo(
    () => buildDocumentVehicleOptions(documents),
    [documents],
  );
  const options = useMemo(
    () => mergeUnitFolderOptions(inventoryOptions, documentOptions),
    [documentOptions, inventoryOptions],
  );

  return { options, reload, status };
}
