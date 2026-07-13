import { Pencil, RefreshCw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import { createInventoryApi } from "../api/apiClient";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
import { inventoryListStatusOptions } from "../model/listCatalogModel";
import {
  InventoryBadge,
  InventoryInput,
  InventoryPanel,
  InventorySelect,
} from "./InventoryFormParts";
import type {
  InventoryListingList,
  InventoryListingSummary,
  InventoryUnitStatus,
} from "../model/types";

type StockState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; result: InventoryListingList }
  | { kind: "error"; message: string };

export function InventoryStockTable({
  api,
  onSelect,
  refreshToken,
}: {
  api: InventoryApi;
  onSelect?: (listingId: string) => void;
  refreshToken?: number;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InventoryUnitStatus | "">("");
  const [state, setState] = useState<StockState>({ kind: "idle" });

  const load = async () => {
    setState({ kind: "loading" });
    try {
      const result = await api.listListings({
        limit: 50,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
      });
      setState({ kind: "ready", result });
    } catch (error) {
      setState({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Nao foi possivel carregar o estoque.",
        ),
      });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load();
  };

  useEffect(() => {
    if (state.kind === "ready") void load();
  }, [refreshToken]);

  return (
    <InventoryPanel icon={<Search className="size-5" />} title="Estoque">
      <form
        className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
        onSubmit={handleSubmit}
      >
        <InventoryInput
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por titulo, placa ou descricao"
          value={search}
        />
        <InventorySelect
          onChange={setStatus}
          options={inventoryListStatusOptions}
          value={status}
        />
        <button
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-70"
          disabled={state.kind === "loading"}
          type="submit"
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-4 ${state.kind === "loading" ? "animate-spin" : ""}`}
          />
          Buscar
        </button>
      </form>

      <div className="mt-4">
        {state.kind === "idle" ? (
          <InventoryTableEmptyState text="Busque para carregar o estoque." />
        ) : null}
        {state.kind === "loading" ? (
          <InventoryTableEmptyState text="Carregando estoque." />
        ) : null}
        {state.kind === "error" ? (
          <FeatureAlert className="feature-alert text-danger">
            {state.message}
          </FeatureAlert>
        ) : null}
        {state.kind === "ready" ? (
          <StockRows
            items={state.result.items}
            {...(onSelect ? { onSelect } : {})}
          />
        ) : null}
      </div>
    </InventoryPanel>
  );
}

export function createInventoryBrowserApi(
  fetchImpl: typeof fetch,
): InventoryApi {
  return createInventoryApi({ fetch: fetchImpl });
}

function StockRows({
  items,
  onSelect,
}: {
  items: readonly InventoryListingSummary[];
  onSelect?: (listingId: string) => void;
}) {
  if (items.length === 0)
    return <InventoryTableEmptyState text="Nenhum veiculo encontrado." />;

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-full border-collapse bg-panel text-left text-sm">
        <thead className="bg-app text-xs font-black uppercase text-muted">
          <tr>
            <th className="px-3 py-3">Veiculo</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Placa</th>
            <th className="px-3 py-3">Preco</th>
            <th className="px-3 py-3">Midia</th>
            <th className="px-3 py-3 text-right">Acao</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.primaryUnit?.id ?? item.listing.id}
              className="border-t border-line"
            >
              <td className="px-3 py-3 font-black text-app-text">
                {item.listing.title}
              </td>
              <td className="px-3 py-3">
                <InventoryBadge tone="blue">
                  {item.primaryUnit?.status ?? item.listing.status}
                </InventoryBadge>
              </td>
              <td className="px-3 py-3 font-bold text-muted">
                {item.primaryUnit?.plate ?? item.listing.plate ?? "-"}
              </td>
              <td className="px-3 py-3 font-bold text-muted">
                {formatPrice(item.listing.priceCents)}
              </td>
              <td className="px-3 py-3 font-bold text-muted">
                {item.mediaCount}
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  aria-label={`Editar ${item.listing.title}`}
                  className="inline-flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent-strong"
                  onClick={() => onSelect?.(item.listing.id)}
                  title="Editar"
                  type="button"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTableEmptyState({ text }: { text: string }) {
  return <FeatureAlert tone="info">{text}</FeatureAlert>;
}

function formatPrice(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}
