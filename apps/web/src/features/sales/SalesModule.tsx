import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Clock, FileText, TrendingUp } from "lucide-react";
import { createSalesApi, type SalesApi } from "./apiClient";
import { createSalesApiOptions } from "./runtimeApi";
import { SalesPipeline } from "./SalesPipeline";
import { SaleWorkspace } from "./SaleWorkspace";
import {
  createDraftFromContext,
  formatCents,
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (message === "Rascunho criado" || message === "Venda atualizada") {
      timer = setTimeout(() => setMessage(null), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message]);

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

  const closedTotal = useMemo(() => {
    return sales
      .filter((s) => s.status === "closed")
      .reduce((acc, s) => acc + (s.salePriceCents ?? 0), 0);
  }, [sales]);

  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <main className="dashboard-main relative z-10 flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <p className="text-xs font-black uppercase text-muted tracking-widest">
            Comercial
          </p>
          <h1 className="text-3xl font-black text-app-text tracking-tight">
            Workspace de Vendas
          </h1>
        </header>

        {/* Sales KPI Cards */}
        <div className="sales-kpi-grid">
          <div className="kpi-card-premium kpi-gradient-blue group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]">
            <div className="kpi-card-glow-container">
              <div className="kpi-card-blob-1 animate-blob-1" />
              <div className="kpi-card-blob-2 animate-blob-2" />
            </div>
            <div className="gloss-overlay" />
            <div className="kpi-card-content">
              <div className="kpi-card-header">
                <div className="kpi-icon-container">
                  <TrendingUp className="size-5.5 text-white" />
                </div>
                <span className="kpi-card-badge">Pipeline</span>
              </div>
              <div className="kpi-card-body">
                <p className="kpi-card-label">Total de Vendas</p>
                <h3 className="kpi-card-value">{sales.length}</h3>
              </div>
            </div>
          </div>

          <div className="kpi-card-premium kpi-gradient-violet group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]">
            <div className="kpi-card-glow-container">
              <div className="kpi-card-blob-1 animate-blob-1" />
              <div className="kpi-card-blob-2 animate-blob-2" />
            </div>
            <div className="gloss-overlay" />
            <div className="kpi-card-content">
              <div className="kpi-card-header">
                <div className="kpi-icon-container">
                  <FileText className="size-5.5 text-white" />
                </div>
                <span className="kpi-card-badge">Rascunhos</span>
              </div>
              <div className="kpi-card-body">
                <p className="kpi-card-label">Em Edição</p>
                <h3 className="kpi-card-value">
                  {sales.filter((s) => s.status === "draft").length}
                </h3>
              </div>
            </div>
          </div>

          <div className="kpi-card-premium kpi-gradient-pink group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]">
            <div className="kpi-card-glow-container">
              <div className="kpi-card-blob-1 animate-blob-1" />
              <div className="kpi-card-blob-2 animate-blob-2" />
            </div>
            <div className="gloss-overlay" />
            <div className="kpi-card-content">
              <div className="kpi-card-header">
                <div className="kpi-icon-container">
                  <Clock className="size-5.5 text-white" />
                </div>
                <span className="kpi-card-badge">Reserva</span>
              </div>
              <div className="kpi-card-body">
                <p className="kpi-card-label">Veículos Reservados</p>
                <h3 className="kpi-card-value">
                  {sales.filter((s) => s.status === "pending").length}
                </h3>
              </div>
            </div>
          </div>

          <div className="kpi-card-premium kpi-gradient-green group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]">
            <div className="kpi-card-glow-container">
              <div className="kpi-card-blob-1 animate-blob-1" />
              <div className="kpi-card-blob-2 animate-blob-2" />
            </div>
            <div className="gloss-overlay" />
            <div className="kpi-card-content">
              <div className="kpi-card-header">
                <div className="kpi-icon-container">
                  <Banknote className="size-5.5 text-white" />
                </div>
                <span className="kpi-card-badge">Fechado</span>
              </div>
              <div className="kpi-card-body">
                <p className="kpi-card-label">Faturamento Recebido</p>
                <h3 className="kpi-card-value">{formatCents(closedTotal)}</h3>
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-line bg-panel p-4 text-sm font-black text-muted shadow-sm flex items-center gap-3">
            <span className="size-2 rounded-full bg-accent animate-ping" />
            <span>{message}</span>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
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
