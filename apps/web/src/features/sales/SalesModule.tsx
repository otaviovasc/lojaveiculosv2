import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSalesApi, type SalesApi } from "./apiClient";
import { createSalesApiOptions } from "./runtimeApi";
import { SalesPipeline } from "./SalesPipeline";
import { SaleWorkspace } from "./SaleWorkspace";
import {
  createDraftFromContext,
  parseSaleStartContext,
  toDraftInput,
} from "./salesModel";
import type { SaleRecord, SaleStatus } from "./types";

export function SalesModule({ api }: { api?: SalesApi }) {
  const [runtimeApi, setRuntimeApi] = useState<SalesApi | null>(api ?? null);
  const [sales, setSales] = useState<readonly SaleRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SaleStatus | "all">("all");
  const [message, setMessage] = useState<string | null>(null);
  const startContextUsed = useRef(false);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }
    void createSalesApiOptions().then((options) =>
      setRuntimeApi(createSalesApi(options)),
    );
  }, [api]);

  const loadSales = useCallback(async () => {
    if (!runtimeApi) return;
    try {
      const result = await runtimeApi.list({ status: filter });
      setSales(result);
      setActiveId((current) => current ?? result[0]?.id ?? null);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }, [filter, runtimeApi]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const createDraft = useCallback(
    async (context = parseSaleStartContext()) => {
      if (!runtimeApi) return;
      try {
        const sale = await runtimeApi.createDraft(
          createDraftFromContext(context),
        );
        setSales((current) => [sale, ...current]);
        setActiveId(sale.id);
        setMessage("Rascunho criado");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    },
    [runtimeApi],
  );

  useEffect(() => {
    if (!runtimeApi || startContextUsed.current) return;
    const context = parseSaleStartContext();
    if (!context.leadId && !context.unitId && !context.listingId) return;
    startContextUsed.current = true;
    void createDraft(context);
  }, [createDraft, runtimeApi]);

  const selectedSale = useMemo(
    () => sales.find((sale) => sale.id === activeId) ?? null,
    [activeId, sales],
  );

  const saveSale = useCallback(
    async (sale: SaleRecord) => {
      if (!runtimeApi) return sale;
      const saved = await runtimeApi.updateDraft(sale.id, toDraftInput(sale));
      setSales((current) => replaceSale(current, saved));
      return saved;
    },
    [runtimeApi],
  );

  const transition = useCallback(
    async (sale: SaleRecord, action: "cancel" | "close" | "reserve") => {
      if (!runtimeApi) return;
      const next =
        action === "reserve"
          ? await runtimeApi.reserve(sale.id, {})
          : action === "close"
            ? await runtimeApi.close(sale.id, {})
            : await runtimeApi.cancel(sale.id, null);
      setSales((current) => replaceSale(current, next));
      setActiveId(next.id);
    },
    [runtimeApi],
  );

  const visibleSales = useMemo(
    () =>
      filter === "all" ? sales : sales.filter((sale) => sale.status === filter),
    [filter, sales],
  );

  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <main className="dashboard-main relative z-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase text-muted">Vendas</p>
          <h1 className="text-2xl font-black text-app-text">
            Workspace de venda
          </h1>
        </header>
        {message ? (
          <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-muted">
            {message}
          </p>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <SalesPipeline
            activeId={activeId}
            filter={filter}
            onCreate={() => void createDraft({})}
            onFilterChange={setFilter}
            onSelect={(sale) => setActiveId(sale.id)}
            sales={visibleSales}
          />
          <SaleWorkspace
            onCancel={(sale) => transition(sale, "cancel")}
            onClose={(sale) => transition(sale, "close")}
            onReserve={(sale) => transition(sale, "reserve")}
            onSave={saveSale}
            sale={selectedSale}
          />
        </div>
      </main>
    </div>
  );
}

function replaceSale(
  current: readonly SaleRecord[],
  next: SaleRecord,
): readonly SaleRecord[] {
  return current.some((sale) => sale.id === next.id)
    ? current.map((sale) => (sale.id === next.id ? next : sale))
    : [next, ...current];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
