import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { createInventoryApi, type InventoryApi } from "../api/apiClient";
import {
  createInventoryApiOptions,
  createInventoryRuntimeHeaders,
} from "../api/inventoryRuntimeApi";
import { InventoryEditPanel } from "../components/InventoryEditPanel";
import { InventoryListHeader } from "../components/InventoryListHeader";
import {
  InventoryListingCardGrid,
  InventoryListingError,
  InventoryListingLoadingGrid,
} from "../components/InventoryListingCardGrid";
import {
  InventoryListToolbar,
  InventoryLoadMore,
} from "../components/InventoryListToolbar";
import {
  InventoryListModals,
  type InventoryActionItem,
} from "../components/InventoryListModals";
import { InventoryCreateMode } from "./InventoryCreateMode";
import {
  createInventoryErrorState,
  createListQuery,
  summarizeInventoryList,
  type InventoryDetailSelectionState,
  type InventoryListQueryInput,
  type InventoryListState,
  type InventoryListStatusFilter,
} from "../model/listCatalogModel";
import { readCurrentInventoryRouteState } from "../model/inventoryRouteState";
import { useInventoryRouteSelection } from "../model/useInventoryRouteSelection";
import type {
  InventoryCatalogSnapshot,
  InventoryListingDetail,
  InventoryListingSummary,
} from "../model/types";
import type { InventoryStoreSettings } from "../components/InventoryPrintTypes";

const initialListQuery: InventoryListQueryInput = { search: "", status: "" };

export function InventoryListPage({ api }: { api?: InventoryApi }) {
  const routeStateRef = useRef(readCurrentInventoryRouteState());
  const [runtimeApi, setRuntimeApi] = useState<InventoryApi | null>(
    api ?? null,
  );
  const [screenMode, setScreenMode] = useState<"list" | "create">(
    routeStateRef.current.screenMode,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InventoryListStatusFilter>("");
  const [appliedQuery, setAppliedQuery] = useState(initialListQuery);
  const [listState, setListState] = useState<InventoryListState>({
    kind: "loading",
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<InventoryListingDetail | null>(null);
  const [selection, setSelection] = useState<InventoryDetailSelectionState>({
    kind: "idle",
  });
  const editPanelRef = useRef<HTMLDivElement>(null);

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

  // V1 Migrated Actions and settings states
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
  const [activeSummaryItem, setActiveSummaryItem] =
    useState<InventoryActionItem | null>(null);
  const [storeSettings, setStoreSettings] =
    useState<InventoryStoreSettings>(null);

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
        const details = await runtimeApi?.getListing(item.listing.id);
        const mediaItems = details?.media || [];
        if (mediaItems.length === 0) {
          alert("Nenhuma imagem cadastrada para este veículo.");
          return;
        }
        const zip = new JSZip();
        for (let i = 0; i < mediaItems.length; i++) {
          const url = mediaItems[i]?.url;
          if (!url) continue;
          const imgRes = await fetch(url);
          const blob = await imgRes.blob();
          zip.file(`foto_${i + 1}.png`, blob);
        }
        const content = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = zipUrl;
        link.download = `fotos-${item.listing.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.zip`;
        link.click();
        URL.revokeObjectURL(zipUrl);
      } catch (err) {
        console.error(err);
        alert("Erro ao baixar fotos do veículo.");
      } finally {
        setLoadingMore(false);
      }
    }
  };

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

  useEffect(() => {
    void loadListings(initialListQuery);
  }, [loadListings]);

  useInventoryRouteSelection({
    api: runtimeApi,
    routeState: routeStateRef,
    setDetail,
    setSelection,
  });

  const refreshListings = () => {
    setAppliedQuery({ search, status });
    void loadListings({ search, status });
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

  if (screenMode === "create") {
    return (
      <InventoryCreateMode
        api={runtimeApi ?? undefined}
        initialStep={routeStateRef.current.createStep}
        onBack={() => {
          setScreenMode("list");
          void loadListings(appliedQuery);
        }}
      />
    );
  }

  const summary =
    listState.kind === "ready"
      ? summarizeInventoryList(listState.result)
      : { available: 0, reserved: 0, sold: 0, total: 0 };

  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <main className="dashboard-main relative z-10">
        <InventoryListHeader
          available={summary.available}
          reserved={summary.reserved}
          sold={summary.sold}
          total={summary.total}
        />
        <InventoryListToolbar
          loading={listState.kind === "loading"}
          onCreate={() => setScreenMode("create")}
          onRefresh={refreshListings}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          search={search}
          status={status}
        />
        <div className="flex flex-col gap-6">
          <section className="w-full flex flex-col gap-6">
            {listState.kind === "loading" ? (
              <InventoryListingLoadingGrid />
            ) : null}
            {listState.kind === "error" ? (
              <InventoryListingError message={listState.message} />
            ) : null}
            {listState.kind === "ready" ? (
              <>
                <InventoryListingCardGrid
                  items={listState.result.items}
                  onSelect={(listingId) => void selectListing(listingId)}
                  onAction={(action, item) => void handleAction(action, item)}
                />
                {listState.result.hasMore &&
                listState.result.nextOffset !== null ? (
                  <InventoryLoadMore
                    loading={loadingMore}
                    onLoadMore={() =>
                      void loadListings(
                        {
                          offset: listState.result.nextOffset ?? 0,
                          search: appliedQuery.search,
                          status: appliedQuery.status,
                        },
                        "append",
                      )
                    }
                  />
                ) : null}
              </>
            ) : null}
          </section>
        </div>
        {runtimeApi && detail ? (
          <div ref={editPanelRef} className="mt-8 border-t border-line pt-8">
            <InventoryEditPanel
              api={runtimeApi}
              detail={detail}
              onUpdated={handleUpdated}
            />
          </div>
        ) : null}
      </main>

      <InventoryListModals
        activeSummaryItem={activeSummaryItem}
        isTemplateOpen={isTemplateOpen}
        isTestDriveOpen={isTestDriveOpen}
        onClose={() => {
          setIsTemplateOpen(false);
          setIsTestDriveOpen(false);
          setActiveSummaryItem(null);
        }}
        storeSettings={storeSettings}
      />
    </div>
  );
}
