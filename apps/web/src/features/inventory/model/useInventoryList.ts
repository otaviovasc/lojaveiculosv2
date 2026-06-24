import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createInventoryApi, type InventoryApi } from "../api/apiClient";
import {
  createInventoryApiOptions,
  createInventoryRuntimeHeaders,
} from "../api/inventoryRuntimeApi";
import { downloadAndZipPhotos } from "../components/zipPhotos";
import {
  createInventoryErrorState,
  createListQuery,
  sortInventoryListItems,
  summarizeInventoryList,
  type InventoryDetailSelectionState,
  type InventoryListQueryInput,
  type InventoryListState,
  type InventoryListStatusFilter,
} from "./listCatalogModel";
import {
  readCurrentInventoryRouteState,
  writeInventoryScreenHash,
} from "./inventoryRouteState";
import { useInventoryRouteSelection } from "./useInventoryRouteSelection";
import type { InventoryListingDetail, InventoryListingSummary } from "./types";
import type { InventoryStoreSettings } from "../components/InventoryPrintTypes";
import type { InventoryActionItem } from "../components/InventoryListModals";

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
  const [selection, setSelection] = useState<InventoryDetailSelectionState>({
    kind: "idle",
  });
  const editPanelRef = useRef<HTMLDivElement>(null);

  // V1 Migrated Actions and settings states
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
    const saved = localStorage.getItem(
      "lojaveiculosv2:inventory_view_preference",
    );
    return saved === "cards" || saved === "list" ? saved : "list";
  });
  const [sortBy, setSortBy] = useState("newest");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      fotos: true,
      placa: true,
      marcaModelo: true,
      anoKm: true,
      preco: true,
      dias: true,
      fase: true,
      leads: true,
      acoes: true,
    },
  );

  const handleViewModeChange = (mode: "list" | "cards") => {
    setViewMode(mode);
    localStorage.setItem("lojaveiculosv2:inventory_view_preference", mode);
  };

  const handleColumnToggle = (key: string, visible: boolean) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: visible }));
  };

  useEffect(() => {
    if (detail) {
      setTimeout(() => {
        editPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    }
  }, [detail]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers = await createInventoryRuntimeHeaders();
        const res = await fetch("/api/v1/settings/store", { headers });
        if (res.ok) {
          const data = (await res.json()) as InventoryStoreSettings;
          setStoreSettings(data);
        }
      } catch (err) {
        console.error("Failed to load store settings", err);
      }
    };
    void fetchSettings();
  }, []);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
    } else {
      void createInventoryApiOptions().then((opts) =>
        setRuntimeApi(createInventoryApi(opts)),
      );
    }
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
        if (!input.search && !input.status && mode !== "append") {
          const sum = summarizeInventoryList(result);
          setUnfilteredSummary(sum);
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
      const query = { search, status };
      setAppliedQuery(query);
      void loadListings(query);
      return;
    }

    if (status !== lastQueryRef.current.status) {
      lastQueryRef.current = { search, status };
      const query = { search, status };
      setAppliedQuery(query);
      void loadListings(query);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      if (search !== lastQueryRef.current.search) {
        lastQueryRef.current = { search, status };
        const query = { search, status };
        setAppliedQuery(query);
        void loadListings(query);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, status, loadListings, runtimeApi]);

  useEffect(() => {
    if (detail && screenMode === "list") {
      setScreenMode("detail");
    }
  }, [detail, screenMode]);

  useInventoryRouteSelection({
    api: runtimeApi,
    routeState: routeStateRef,
    setDetail,
    setSelection,
  });

  const refreshListings = () => {
    const query = { search, status };
    setAppliedQuery(query);
    void loadListings(query);
  };

  const applyStatusFilter = (nextStatus: InventoryListStatusFilter) => {
    const nextQuery = { search, status: nextStatus };
    setStatus(nextStatus);
    setAppliedQuery(nextQuery);
    void loadListings(nextQuery);
  };

  const selectListing = async (listingId: string) => {
    if (!runtimeApi) return;
    setSelection({ kind: "loading", listingId });
    try {
      setDetail(await runtimeApi.getListing(listingId));
      setSelection({ kind: "ready", listingId });
    } catch (err) {
      setSelection({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
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
      setListState({ kind: "loading" });
      try {
        const details = await runtimeApi?.getListing(item.listing.id);
        setActiveSummaryItem({ ...item, media: details?.media || [] });
        setIsTemplateOpen(true);
      } catch (err) {
        console.error(err);
        setActiveSummaryItem({ ...item, media: [] });
        setIsTemplateOpen(true);
      } finally {
        void loadListings(appliedQuery);
      }
    } else if (action === "test-drive") {
      setActiveSummaryItem(item);
      setIsTestDriveOpen(true);
    } else if (action === "zip-photos") {
      setLoadingMore(true);
      try {
        if (runtimeApi) {
          await downloadAndZipPhotos(runtimeApi, item);
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao baixar fotos do veículo.");
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
    selection,
    editPanelRef,
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
