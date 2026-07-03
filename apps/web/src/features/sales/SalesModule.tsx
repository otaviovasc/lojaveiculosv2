import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Clock, FileText, TrendingUp } from "lucide-react";
import {
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
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
import {
  emptySaleContextOptions,
  loadSaleContextOptions,
  type SaleContextOptionsState,
} from "./saleContextOptions";
import type { SaleRecord, SaleStatus } from "./types";

export function SalesModule({ api }: { api?: SalesApi }) {
  const accountSession = useOptionalAccountSession();
  const [runtimeApi, setRuntimeApi] = useState<SalesApi | null>(api ?? null);
  const [contextOptions, setContextOptions] = useState<SaleContextOptionsState>(
    { kind: "loading", options: emptySaleContextOptions },
  );
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

  useEffect(() => {
    let isActive = true;
    setContextOptions({ kind: "loading", options: emptySaleContextOptions });
    void loadSaleContextOptions(
      accountSession
        ? {
            email: accountSession.user.email,
            id: accountSession.user.id,
            name: accountSession.user.name,
            role: accountSession.defaultStore?.role ?? null,
          }
        : null,
    )
      .then((state) => {
        if (isActive) setContextOptions(state);
      })
      .catch(() => {
        if (!isActive) return;
        setContextOptions({
          kind: "error",
          message: "Nao foi possivel carregar os vinculos da venda.",
          options: emptySaleContextOptions,
        });
      });
    return () => {
      isActive = false;
    };
  }, [accountSession]);

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
      return next;
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
    <FeaturePageShell mainClassName="flex flex-col gap-6">
      <FeaturePageHeader eyebrow="Comercial" title="Workspace de Vendas" />

      <FeatureKpiStrip ariaLabel="Resumo de vendas">
        <FeatureKpiCard
          icon={TrendingUp}
          label="Total de vendas"
          tone="blue"
          value={sales.length}
        />
        <FeatureKpiCard
          icon={FileText}
          label="Em edição"
          tone="violet"
          value={sales.filter((sale) => sale.status === "draft").length}
        />
        <FeatureKpiCard
          icon={Clock}
          label="Veículos reservados"
          tone="pink"
          value={sales.filter((sale) => sale.status === "pending").length}
        />
        <FeatureKpiCard
          icon={Banknote}
          label="Faturamento recebido"
          tone="green"
          value={formatCents(closedTotal)}
        />
      </FeatureKpiStrip>

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
          contextMessage={contextMessage(contextOptions)}
          contextOptions={contextOptions.options}
          onCancel={(sale) => transition(sale, "cancel")}
          onClose={(sale) => transition(sale, "close")}
          onReserve={(sale) => transition(sale, "reserve")}
          onSave={saveSale}
          sale={selectedSale}
        />
      </div>
    </FeaturePageShell>
  );
}

function contextMessage(state: SaleContextOptionsState): string | null {
  if (state.kind === "loading") {
    return "Carregando leads, veiculos e vendedores vinculaveis.";
  }
  if (state.kind === "error") return state.message;
  return null;
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
  return formatApiErrorDisplay(error, "Não foi possível carregar as vendas.");
}
