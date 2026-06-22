import { useEffect, type MutableRefObject } from "react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryDetailSelectionState } from "./listCatalogModel";
import type { InventoryListingDetail } from "./types";
import type { InventoryRouteState } from "./inventoryRouteState";

export function useInventoryRouteSelection({
  api,
  routeState,
  setDetail,
  setSelection,
}: {
  api: InventoryApi | null;
  routeState: MutableRefObject<InventoryRouteState>;
  setDetail: (detail: InventoryListingDetail | null) => void;
  setSelection: (selection: InventoryDetailSelectionState) => void;
}) {
  useEffect(() => {
    if (!api || !routeState.current.listingId) return;
    const listingId = routeState.current.listingId;
    routeState.current = { ...routeState.current, listingId: null };
    setSelection({ kind: "loading", listingId });
    void api
      .getListing(listingId)
      .then((result) => {
        setDetail(result);
        setSelection({ kind: "ready", listingId });
      })
      .catch((error) =>
        setSelection({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        }),
      );
  }, [api, routeState, setDetail, setSelection]);
}
