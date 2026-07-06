import type { InventoryApi } from "../api/apiClient";
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
import { InventoryListingTable } from "../components/InventoryListingTable";
import { InventoryListModals } from "../components/InventoryListModals";
import { InventoryCreateMode } from "./InventoryCreateMode";
import { InventoryDetailWorkspace } from "../components/InventoryDetailWorkspace";
import type { InventoryDetailStoreLink } from "../components/InventoryDetailPublicRoute";
import { useInventoryList } from "../model/useInventoryList";
import { FeaturePageShell } from "../../../components/ui/FeatureLayout";

export function InventoryListPage({
  api,
  stores = [],
}: {
  api?: InventoryApi;
  stores?: readonly InventoryDetailStoreLink[];
}) {
  const {
    routeStateRef,
    runtimeApi,
    screenMode,
    setScreenMode,
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
  } = useInventoryList(api);

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

  if (screenMode === "detail" && runtimeApi && detail) {
    return (
      <InventoryDetailWorkspace
        api={runtimeApi}
        detail={detail}
        selectedUnitId={selectedUnitId}
        stores={stores}
        onBack={() => {
          setScreenMode("list");
          setDetail(null);
        }}
        onUpdated={handleUpdated}
      />
    );
  }

  const summary = unfilteredSummary || {
    available: 0,
    reserved: 0,
    sold: 0,
    total: 0,
  };

  return (
    <FeaturePageShell>
      <InventoryListHeader
        activeStatus={status}
        available={summary.available}
        onStatusSelect={applyStatusFilter}
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
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        visibleColumns={visibleColumns}
        onColumnToggle={handleColumnToggle}
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
              {viewMode === "cards" ? (
                <InventoryListingCardGrid
                  items={sortedItems}
                  onSelect={(listingId, unitId) =>
                    void selectListing(listingId, unitId)
                  }
                  onAction={(action, item) => void handleAction(action, item)}
                />
              ) : (
                <InventoryListingTable
                  items={sortedItems}
                  onSelect={(listingId, unitId) =>
                    void selectListing(listingId, unitId)
                  }
                  onAction={(action, item) => void handleAction(action, item)}
                  onSortChange={setSortBy}
                  sortBy={sortBy}
                  visibleColumns={visibleColumns}
                />
              )}
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
    </FeaturePageShell>
  );
}
