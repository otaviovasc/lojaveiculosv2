import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { useOptionalAccountSession } from "../account/accountSession";
import { createSalesApi, type SalesApi } from "./apiClient";
import { createSalesApiOptions } from "./runtimeApi";
import { SalesList } from "./SalesList";
import { SalesModuleOverview } from "./SalesModuleOverview";
import { SaleWorkspace } from "./SaleWorkspace";
import {
  createDraftFromContext,
  parseSaleStartContext,
  toDraftInput,
} from "./salesModel";
import {
  emptySaleContextOptions,
  loadSaleContextOptions,
  type SaleContextOptionsState,
} from "./saleContextOptions";
import {
  contextMessage,
  replaceSale,
  salesErrorMessage,
} from "./salesModuleSupport";
import type { SaleRecord } from "./types";

export function SalesModule({ api }: { api?: SalesApi }) {
  const accountSession = useOptionalAccountSession();
  const [runtimeApi, setRuntimeApi] = useState<SalesApi | null>(api ?? null);
  const [contextOptions, setContextOptions] = useState<SaleContextOptionsState>(
    { kind: "loading", options: emptySaleContextOptions },
  );
  const [sales, setSales] = useState<readonly SaleRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "workspace">("list");
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

  const fetchContextOptions = useCallback(
    () =>
      loadSaleContextOptions(
        accountSession
          ? {
              email: accountSession.user.email,
              id: accountSession.user.id,
              name: accountSession.user.name,
              role: accountSession.defaultStore?.role ?? null,
            }
          : null,
      ),
    [accountSession],
  );

  useEffect(() => {
    let isActive = true;
    setContextOptions({ kind: "loading", options: emptySaleContextOptions });
    void fetchContextOptions()
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
  }, [fetchContextOptions]);

  const loadSales = useCallback(async () => {
    if (!runtimeApi) return;
    try {
      const result = await runtimeApi.list({ status: "all" });
      setSales(result);
    } catch (error) {
      setMessage(salesErrorMessage(error));
    }
  }, [runtimeApi]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (
      message === "Rascunho criado" ||
      message === "Venda atualizada" ||
      message?.includes("Correção criada") ||
      message?.includes("excluída")
    ) {
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
        setViewMode("workspace");
        setMessage("Rascunho criado");
      } catch (error) {
        setMessage(salesErrorMessage(error));
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

  const handleDelete = useCallback(
    async (saleId: string) => {
      if (!runtimeApi) return;
      try {
        await runtimeApi.delete(saleId);
        setSales((current) => current.filter((sale) => sale.id !== saleId));
        if (activeId === saleId) {
          setActiveId(null);
        }
        setMessage("Venda excluída com sucesso");
      } catch (error) {
        setMessage(salesErrorMessage(error));
      }
    },
    [activeId, runtimeApi],
  );

  const transition = useCallback(
    async (
      sale: SaleRecord,
      action: "cancel" | "close" | "reserve",
      reason?: string,
    ) => {
      if (!runtimeApi) return;
      const next =
        action === "reserve"
          ? await runtimeApi.reserve(sale.id, {})
          : action === "close"
            ? await runtimeApi.close(sale.id, {})
            : await runtimeApi.cancel(sale.id, reason ?? null);
      setSales((current) => replaceSale(current, next));
      setActiveId(next.id);
      return next;
    },
    [runtimeApi],
  );

  const revert = useCallback(
    async (sale: SaleRecord, reason: string) => {
      if (!runtimeApi) return;
      const correction = await runtimeApi.revert(sale.id, reason);
      setContextOptions({ kind: "loading", options: emptySaleContextOptions });
      const refreshedOptions = await fetchContextOptions().catch(
        (): SaleContextOptionsState => ({
          kind: "error",
          message: "Nao foi possivel recarregar os vinculos da correção.",
          options: emptySaleContextOptions,
        }),
      );
      setContextOptions(refreshedOptions);
      setSales((current) =>
        replaceSale(
          current.map((item) =>
            item.id === sale.id ? { ...item, isCurrentRevision: false } : item,
          ),
          correction,
        ),
      );
      setActiveId(correction.id);
      setMessage(`Correção criada na revisão ${correction.revision}`);
      return correction;
    },
    [fetchContextOptions, runtimeApi],
  );

  return (
    <FeaturePageShell mainClassName="flex flex-col gap-6">
      <SalesModuleOverview message={message} sales={sales} />

      {viewMode === "list" ? (
        <SalesList
          sales={sales}
          onEdit={(sale) => {
            setActiveId(sale.id);
            setViewMode("workspace");
          }}
          onDelete={(saleId) => {
            void handleDelete(saleId);
          }}
          onCreate={() => void createDraft({})}
        />
      ) : (
        <SaleWorkspace
          contextMessage={contextMessage(contextOptions)}
          contextOptions={contextOptions.options}
          onCancel={(sale, reason) => transition(sale, "cancel", reason)}
          onClose={(sale) => transition(sale, "close")}
          onReserve={(sale) => transition(sale, "reserve")}
          onRevert={revert}
          onSave={saveSale}
          sale={selectedSale}
          onBack={() => setViewMode("list")}
        />
      )}
    </FeaturePageShell>
  );
}
