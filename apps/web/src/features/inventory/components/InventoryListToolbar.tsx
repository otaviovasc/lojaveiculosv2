import { Filter, Plus, RefreshCw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
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
    <section className="glass-panel-branded p-5">
      <form
        className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"
        onSubmit={submit}
      >
        <label className="relative block">
          <span className="sr-only">Buscar veículos</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <InventoryInput
            className="w-full pl-10"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por título, marca, modelo ou placa"
            value={search}
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Filtrar por status</span>
          <Filter
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <InventorySelect
            className="w-full pl-10"
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

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-inverse disabled:opacity-70 cursor-pointer shadow-sm"
            disabled={loading}
            type="submit"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
            <span>Buscar</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-soft px-5 text-sm font-black text-accent-strong cursor-pointer border border-accent-soft/20"
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            <span>Novo</span>
          </motion.button>
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
    <div className="flex justify-center py-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-soft px-6 text-sm font-black text-accent-strong disabled:opacity-70 cursor-pointer border border-accent-soft/20 shadow-sm"
        disabled={loading}
        onClick={onLoadMore}
        type="button"
      >
        <RefreshCw
          aria-hidden="true"
          className={`size-4 ${loading ? "animate-spin" : ""}`}
        />
        <span>Carregar mais {INVENTORY_PAGE_SIZE}</span>
      </motion.button>
    </div>
  );
}
