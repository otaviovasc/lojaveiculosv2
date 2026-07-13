import { Plus, Search, X } from "lucide-react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { CustomSelect } from "../../components/ui/CustomSelect";
import {
  salesSortOptions,
  salesStatusOptions,
  type SalesSortOption,
  type SalesStatusFilter,
} from "./SalesListModel";

export function SalesListFilters({
  endDate,
  filter,
  onCreate,
  onEndDateChange,
  onSearchChange,
  onSortChange,
  onStartDateChange,
  onStatusChange,
  search,
  sortBy,
  startDate,
}: {
  endDate: Date | null;
  filter: SalesStatusFilter;
  onCreate: () => void;
  onEndDateChange: (value: Date | null) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SalesSortOption) => void;
  onStartDateChange: (value: Date | null) => void;
  onStatusChange: (value: SalesStatusFilter) => void;
  search: string;
  sortBy: SalesSortOption;
  startDate: Date | null;
}) {
  return (
    <div className="flex flex-col gap-4 bg-panel p-5 rounded-2xl border border-line shadow-sm">
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="sales-search-container flex-1">
          <Search className="size-4 text-muted" />
          <input
            className="sales-search-input"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por lead, comprador, veículo ou placa..."
            type="text"
            value={search}
          />
        </div>

        <button
          className="sales-primary-button !min-h-[2.5rem] !h-[2.5rem] px-5 font-black flex items-center gap-1.5 self-stretch md:self-auto shrink-0 justify-center"
          onClick={onCreate}
          type="button"
        >
          <div className="gloss-overlay" />
          <Plus className="size-4" />
          <span>Nova Venda</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border-t border-line/45 pt-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-muted uppercase tracking-wider">
              Status:
            </span>
            <CustomSelect
              className="text-xs font-black uppercase tracking-wider bg-app-elevated border-line cursor-pointer"
              density="compact"
              onChange={(value) => onStatusChange(value as SalesStatusFilter)}
              options={salesStatusOptions}
              radius="xl"
              value={filter}
            />
          </div>

          <div className="datepicker-range-picker flex items-center bg-app-elevated border border-line p-0.5 rounded-xl h-10 px-1.5 shrink-0 justify-between sm:justify-start">
            <DatePickerField
              label="De"
              onChange={(value) => onStartDateChange(value)}
              value={startDate}
            />
            <span className="datepicker-separator-text px-1 text-muted text-xs font-black uppercase">
              até
            </span>
            <DatePickerField
              label="Até"
              onChange={(value) => onEndDateChange(value)}
              value={endDate}
            />
            {(startDate || endDate) && (
              <button
                className="p-1 hover:bg-app rounded-md text-muted hover:text-app-text ml-1.5 shrink-0"
                onClick={() => {
                  onStartDateChange(null);
                  onEndDateChange(null);
                }}
                title="Limpar Datas"
                type="button"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 justify-between lg:justify-end">
          <span className="text-xs font-black text-muted uppercase tracking-wider">
            Ordenar:
          </span>
          <CustomSelect
            className="text-xs font-black uppercase tracking-wider bg-app-elevated border-line cursor-pointer"
            density="compact"
            onChange={(value) => onSortChange(value as SalesSortOption)}
            options={salesSortOptions}
            radius="xl"
            value={sortBy}
          />
        </div>
      </div>
    </div>
  );
}
