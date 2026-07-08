import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import { createInventoryApi, type InventoryApi } from "../api/apiClient";
import {
  createInventoryApiOptions,
  createInventoryRuntimeHeaders,
} from "../api/inventoryRuntimeApi";
import { downloadAndZipPhotos } from "../components/zipPhotos";
import type { InventoryActionItem } from "../components/InventoryListModals";
import type { InventoryStoreSettings } from "../components/InventoryPrintTypes";
import {
  createInventoryErrorState,
  createListQuery,
  summarizeInventoryList,
  type InventoryDetailSelectionState,
  type InventoryListQueryInput,
  type InventoryListState,
  type InventoryListStatusFilter,
} from "./listCatalogModel";
import {
  DEFAULT_INVENTORY_LIST_SORT,
  sortInventoryListItems,
  type InventoryListSortKey,
} from "./inventoryListSortModel";
import {
  readCurrentInventoryRouteState,
  writeInventoryScreenHash,
} from "./inventoryRouteState";
import { initialInventoryVisibleColumns } from "./inventoryListColumns";
import { useInventoryRouteSelection } from "./useInventoryRouteSelection";
import type { InventoryListingDetail, InventoryListingSummary } from "./types";

export function useInventoryList(api?: InventoryApi) {
  const routeStateRef = useRef(readCurrentInventoryRouteState());
  const [runtimeApi, setRuntimeApi] = useState<InventoryApi | null>(
    api ?? null,
  );
  const [screenMode, setScreenMode] = useState<"list" | "create" | "detail">(
    routeStateRef.current.screenMode,
  );
  const setInventoryScreenMode = useCallback(
    (nextMode: "list" | "create" | "detail") => {
      setScreenMode(nextMode);
      writeInventoryScreenHash(nextMode, routeStateRef.current.createStep);
    },
    [],
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InventoryListStatusFilter>("");
  const [appliedQuery, setAppliedQuery] = useState<InventoryListQueryInput>({
    search: "",
    status: "",
  });
  const [listState, setListState] = useState<InventoryListState>({
    kind: "loading",
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<InventoryListingDetail | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    routeStateRef.current.unitId,
  );
  const [selection, setSelection] = useState<InventoryDetailSelectionState>({
    kind: "idle",
  });
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
  const [activeSummaryItem, setActiveSummaryItem] =
    useState<InventoryActionItem | null>(null);
  const [storeSettings, setStoreSettings] =
    useState<InventoryStoreSettings>(null);
  const [unfilteredSummary, setUnfilteredSummary] = useState<{
    available: number;
    reserved: number;
    sold: number;
    total: number;
  } | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "cards">(() => {
    if (typeof window === "undefined") return "list";
    const saved = window.localStorage?.getItem?.(
      "lojaveiculosv2:inventory_view_preference",
    );
    if (saved === "cards" || saved === "list") return saved;
    return window.matchMedia?.("(max-width: 767px)").matches ? "cards" : "list";
  });
  const [sortBy, setSortBy] = useState<InventoryListSortKey>(
    DEFAULT_INVENTORY_LIST_SORT,
  );
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    initialInventoryVisibleColumns,
  );

  const handleViewModeChange = (mode: "list" | "cards") => {
    setViewMode(mode);
    window.localStorage?.setItem?.(
      "lojaveiculosv2:inventory_view_preference",
      mode,
    );
  };

  const handleColumnToggle = (key: string, visible: boolean) =>
    setVisibleColumns((prev) => ({ ...prev, [key]: visible }));

  useEffect(() => {
    const loadStoreSettings = async () => {
      try {
        const headers = await createInventoryRuntimeHeaders();
        const response = await fetch("/api/v1/settings/store", { headers });
        if (response.ok) {
          setStoreSettings((await response.json()) as InventoryStoreSettings);
        }
      } catch (error) {
        console.error("Failed to load store settings", error);
      }
    };
    void loadStoreSettings();
  }, []);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }
    void createInventoryApiOptions().then((opts) =>
      setRuntimeApi(createInventoryApi(opts)),
    );
  }, [api]);

  const loadListings = useCallback(
    async (
      input: InventoryListQueryInput,
      mode: "append" | "replace" = "replace",
    ) => {
      if (!runtimeApi) return;
      if (mode === "append") setLoadingMore(true);
      else setListState({ kind: "loading" });
      try {
        const result = await runtimeApi.listListings(createListQuery(input));
        if (mode !== "append") {
          if (!input.search && !input.status) {
            setUnfilteredSummary(summarizeInventoryList(result));
          } else {
            try {
              const unfiltered = await runtimeApi.listListings(
                createListQuery({ search: "", status: "" }),
              );
              setUnfilteredSummary(summarizeInventoryList(unfiltered));
            } catch (err) {
              console.error("Failed to load unfiltered summary", err);
            }
          }
        }
        setListState((curr) =>
          mode !== "append" || curr.kind !== "ready"
            ? { kind: "ready", result }
            : {
                kind: "ready",
                result: {
                  ...result,
                  items: [...curr.result.items, ...result.items],
                  total: curr.result.items.length + result.items.length,
                },
              },
        );
      } catch (error) {
        setListState(createInventoryErrorState(error));
      } finally {
        setLoadingMore(false);
      }
    },
    [runtimeApi],
  );

  const lastQueryRef = useRef({ search: "", status: "" });
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!runtimeApi) return;
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      setAppliedQuery({ search, status });
      void loadListings({ search, status });
      return;
    }
    if (status !== lastQueryRef.current.status) {
      lastQueryRef.current = { search, status };
      setAppliedQuery({ search, status });
      void loadListings({ search, status });
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      if (search !== lastQueryRef.current.search) {
        lastQueryRef.current = { search, status };
        setAppliedQuery({ search, status });
        void loadListings({ search, status });
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, status, loadListings, runtimeApi]);

  useEffect(() => {
    if (detail && screenMode === "list") setScreenMode("detail");
  }, [detail, screenMode]);

  useInventoryRouteSelection({
    api: runtimeApi,
    routeState: routeStateRef,
    setDetail,
    setSelection,
    setSelectedUnitId,
  });

  const refreshListings = () => {
    setAppliedQuery({ search, status });
    void loadListings({ search, status });
  };

  const applyStatusFilter = (nextStatus: InventoryListStatusFilter) =>
    setStatus(nextStatus);

  const selectListing = async (listingId: string, unitId?: string | null) => {
    if (!runtimeApi) return;
    setSelectedUnitId(unitId ?? null);
    setSelection({ kind: "loading", listingId });
    try {
      setDetail(await runtimeApi.getListing(listingId));
      setSelection({ kind: "ready", listingId });
    } catch (err) {
      setSelection({
        kind: "error",
        message: formatApiErrorDisplay(
          err,
          "Nao foi possivel abrir o estoque selecionado.",
        ),
      });
    }
  };

  const handleUpdated = (res: InventoryListingDetail) => {
    setDetail(res);
    setSelection({ kind: "ready", listingId: res.listing.id });
    void loadListings(appliedQuery);
  };

  const handleAction = async (
    action: "template" | "test-drive" | "zip-photos",
    item: InventoryListingSummary,
  ) => {
    if (action === "template") {
      setLoadingMore(true);
      try {
        const listing = await runtimeApi?.getListing(item.listing.id);
        setActiveSummaryItem({ ...item, media: listing?.media ?? [] });
        setIsTemplateOpen(true);
      } catch (error) {
        console.error(error);
        setListState(createInventoryErrorState(error));
      } finally {
        setLoadingMore(false);
      }
      return;
    }

    if (action === "test-drive") {
      setActiveSummaryItem(item);
      setIsTestDriveOpen(true);
      return;
    }

    if (action === "zip-photos") {
      setLoadingMore(true);
      try {
        if (runtimeApi) await downloadAndZipPhotos(runtimeApi, item);
      } catch (err) {
        console.error(err);
        setListState({
          kind: "error",
          message: formatApiErrorDisplay(
            err,
            "Nao foi possivel baixar as fotos do veiculo.",
          ),
        });
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const sortedItems = useMemo(() => {
    if (listState.kind !== "ready") return [];
    return sortInventoryListItems(listState.result.items, sortBy);
  }, [listState, sortBy]);

  return {
    routeStateRef,
    runtimeApi,
    screenMode,
    setScreenMode: setInventoryScreenMode,
    search,
    setSearch,
    status,
    setStatus,
    appliedQuery,
    listState,
    loadingMore,
    detail,
    setDetail,
    selectedUnitId,
    selection,
    isTemplateOpen,
    setIsTemplateOpen,
    isTestDriveOpen,
    setIsTestDriveOpen,
    activeSummaryItem,
    setActiveSummaryItem,
    storeSettings,
    viewMode,
    handleViewModeChange,
    sortBy,
    setSortBy,
    visibleColumns,
    handleColumnToggle,
    loadListings,
    refreshListings,
    applyStatusFilter,
    selectListing,
    handleUpdated,
    handleAction,
    sortedItems,
    unfilteredSummary,
  };
}
