import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createInventoryApi, type InventoryApi } from "../api/apiClient";
import { createInventoryApiOptions } from "../api/inventoryRuntimeApi";
import { InventoryCatalogExplorer } from "../components/InventoryCatalogExplorer";
import { InventoryEditPanel } from "../components/InventoryEditPanel";
import { InventoryListHeader } from "../components/InventoryListHeader";
import {
  InventoryListingCardGrid,
  InventoryListingError,
  InventoryListingLoadingGrid,
} from "../components/InventoryListingCardGrid";
import { InventoryListSelectionStatus } from "../components/InventoryListSelectionStatus";
import {
  InventoryListToolbar,
  InventoryLoadMore,
} from "../components/InventoryListToolbar";
import { InventoryCreatePage } from "./InventoryCreatePage";
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
} from "../model/types";

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
  const [catalog, setCatalog] = useState<InventoryCatalogSnapshot | null>(null);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }

    void createInventoryApiOptions().then((options) => {
      setRuntimeApi(createInventoryApi(options));
    });
  }, [api]);

  const loadListings = useCallback(
    async (
      input: InventoryListQueryInput,
      mode: "append" | "replace" = "replace",
    ) => {
      if (!runtimeApi) return;

      if (mode === "append") {
        setLoadingMore(true);
      } else {
        setListState({ kind: "loading" });
      }
      try {
        const result = await runtimeApi.listListings(createListQuery(input));
        setListState((current) => {
          if (mode !== "append" || current.kind !== "ready") {
            return { kind: "ready", result };
          }

          return {
            kind: "ready",
            result: {
              ...result,
              items: [...current.result.items, ...result.items],
              total: current.result.items.length + result.items.length,
            },
          };
        });
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
    const query = { search, status };
    setAppliedQuery(query);
    void loadListings(query);
  };

  const selectListing = async (listingId: string) => {
    if (!runtimeApi) return;

    setSelection({ kind: "loading", listingId });
    try {
      const result = await runtimeApi.getListing(listingId);
      setDetail(result);
      setSelection({ kind: "ready", listingId });
    } catch (error) {
      setSelection({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleUpdated = (result: InventoryListingDetail) => {
    setDetail(result);
    setSelection({ kind: "ready", listingId: result.listing.id });
    void loadListings(appliedQuery);
  };

  if (screenMode === "create") {
    return (
      <>
        <section className="mx-auto max-w-[var(--layout-content-max)] px-4 pt-4 lg:px-4">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-soft px-4 text-sm font-black text-accent-strong"
            onClick={() => {
              setScreenMode("list");
              void loadListings(appliedQuery);
            }}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar ao estoque
          </button>
        </section>
        <InventoryCreatePage
          api={runtimeApi ?? undefined}
          initialStep={routeStateRef.current.createStep}
        />
      </>
    );
  }

  const summary =
    listState.kind === "ready"
      ? summarizeInventoryList(listState.result)
      : { available: 0, reserved: 0, sold: 0, total: 0 };

  return (
    <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-4">
      <InventoryListHeader
        available={summary.available}
        hasMore={listState.kind === "ready" && listState.result.hasMore}
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid content-start gap-4">
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

        <div className="grid content-start gap-4">
          <InventoryCatalogExplorer
            api={runtimeApi}
            catalog={catalog}
            onCatalogChange={setCatalog}
          />
          <InventoryListSelectionStatus state={selection} />
        </div>
      </div>

      {runtimeApi && detail ? (
        <InventoryEditPanel
          api={runtimeApi}
          detail={detail}
          onUpdated={handleUpdated}
        />
      ) : null}
    </main>
  );
}
