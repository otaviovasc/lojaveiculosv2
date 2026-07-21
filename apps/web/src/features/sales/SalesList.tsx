import { useMemo, useState } from "react";
import { SalesListCards } from "./SalesListCards";
import { SalesListDeleteDialog } from "./SalesListDeleteDialog";
import { SalesListDetailsDialog } from "./SalesListDetailsDialog";
import { SalesListFilters } from "./SalesListFilters";
import {
  filterSales,
  sortSales,
  type SalesSortOption,
  type SalesStatusFilter,
} from "./SalesListModel";
import type { SaleRecord } from "./types";

export function SalesList({
  sales,
  onEdit,
  onDelete,
  onCreate,
}: {
  sales: readonly SaleRecord[];
  onEdit: (sale: SaleRecord) => void;
  onDelete: (saleId: string) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SalesStatusFilter>("all");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);
  const [sortBy, setSortBy] = useState<SalesSortOption>("date_desc");
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  });

  const filteredSales = useMemo(
    () => filterSales(sales, { endDate, filter, search, startDate }),
    [sales, filter, search, startDate, endDate],
  );
  const sortedSales = useMemo(
    () => sortSales(filteredSales, sortBy),
    [filteredSales, sortBy],
  );

  return (
    <div className="flex flex-col gap-6">
      <SalesListFilters
        endDate={endDate}
        filter={filter}
        onCreate={onCreate}
        onEndDateChange={setEndDate}
        onSearchChange={setSearch}
        onSortChange={setSortBy}
        onStartDateChange={setStartDate}
        onStatusChange={setFilter}
        search={search}
        sortBy={sortBy}
        startDate={startDate}
      />

      <SalesListCards
        filteredCount={filteredSales.length}
        onCreate={onCreate}
        onDeleteRequest={setSaleToDelete}
        onEdit={onEdit}
        onView={setSelectedSale}
        sales={sortedSales}
      />

      {selectedSale ? (
        <SalesListDetailsDialog
          onClose={() => setSelectedSale(null)}
          onEdit={(sale) => {
            setSelectedSale(null);
            onEdit(sale);
          }}
          sale={selectedSale}
        />
      ) : null}

      {saleToDelete ? (
        <SalesListDeleteDialog
          onClose={() => setSaleToDelete(null)}
          onConfirm={() => {
            onDelete(saleToDelete.id);
            setSaleToDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
