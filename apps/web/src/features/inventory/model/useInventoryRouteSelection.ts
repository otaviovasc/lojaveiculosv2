import { useEffect, type MutableRefObject } from "react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryDetailSelectionState } from "./listCatalogModel";
import type { InventoryListingDetail } from "./types";
import type { InventoryRouteState } from "./inventoryRouteState";

export function useInventoryRouteSelection({
  api,
  routeState,
  setDetail,
  setSelection,
  setSelectedUnitId,
}: {
  api: InventoryApi | null;
  routeState: MutableRefObject<InventoryRouteState>;
  setDetail: (detail: InventoryListingDetail | null) => void;
  setSelection: (selection: InventoryDetailSelectionState) => void;
  setSelectedUnitId: (unitId: string | null) => void;
}) {
  useEffect(() => {
    if (!api || !routeState.current.listingId) return;
    const listingId = routeState.current.listingId;
    const unitId = routeState.current.unitId;
    routeState.current = {
      ...routeState.current,
      listingId: null,
      unitId: null,
    };
    setSelection({ kind: "loading", listingId });
    void api
      .getListing(listingId)
      .then((result) => {
        setSelectedUnitId(unitId);
        setDetail(result);
        setSelection({ kind: "ready", listingId });
      })
      .catch((error) =>
        setSelection({
          kind: "error",
          message: formatApiErrorDisplay(
            error,
            "Nao foi possivel abrir o estoque selecionado.",
          ),
        }),
      );
  }, [api, routeState, setDetail, setSelection, setSelectedUnitId]);
}
