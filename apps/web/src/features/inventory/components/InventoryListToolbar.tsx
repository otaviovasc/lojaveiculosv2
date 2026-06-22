import { Filter, Plus, RefreshCw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { InventoryInput, InventorySelect } from "./InventoryFormParts";
import {
  inventoryListStatusOptions,
  type InventoryListStatusFilter,
} from "../model/listCatalogModel";

export const INVENTORY_PAGE_SIZE = 100;

export function InventoryListToolbar({
  loading,
  onCreate,
  onRefresh,
  onSearchChange,
  onStatusChange,
  search,
  status,
}: {
  loading: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: InventoryListStatusFilter) => void;
  search: string;
  status: InventoryListStatusFilter;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRefresh();
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-[var(--shadow-panel)]">
      <form className="grid gap-3 lg:grid-cols-[1fr_220px_auto]" onSubmit={submit}>
        <label className="relative">
          <span className="sr-only">Buscar veiculos</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <InventoryInput
            className="pl-10"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por titulo, marca, modelo ou placa"
            value={search}
          />
        </label>

        <label className="relative">
          <span className="sr-only">Filtrar por status</span>
          <Filter
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <InventorySelect
            className="pl-10"
            onChange={(event) =>
              onStatusChange(event.target.value as InventoryListStatusFilter)
            }
            value={status}
          >
            {inventoryListStatusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </InventorySelect>
        </label>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
            Buscar
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-soft px-4 text-sm font-black text-accent-strong"
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Novo
          </button>
        </div>
      </form>
    </section>
  );
}

export function InventoryLoadMore({
  loading,
  onLoadMore,
}: {
  loading: boolean;
  onLoadMore: () => void;
}) {
  return (
    <button
      className="mx-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-soft px-5 text-sm font-black text-accent-strong disabled:opacity-70"
      disabled={loading}
      onClick={onLoadMore}
      type="button"
    >
      <RefreshCw
        aria-hidden="true"
        className={`size-4 ${loading ? "animate-spin" : ""}`}
      />
      Carregar mais {INVENTORY_PAGE_SIZE}
    </button>
  );
}
