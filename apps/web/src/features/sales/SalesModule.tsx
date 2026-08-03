import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { FeatureLoadingState } from "../../components/ui/FeatureStates";
import { useOptionalAccountSession } from "../account/accountSession";
import {
  createInventoryApi,
  type InventoryApi,
} from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import { createSalesApi, type SalesApi } from "./apiClient";
import { createSalesApiOptions } from "./runtimeApi";
import { SalesList } from "./SalesList";
import { SalesModuleOverview } from "./SalesModuleOverview";
import { SaleWorkspace } from "./SaleWorkspace";
import {
  clearSaleStartContext,
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
  findCurrentSaleForContext,
  isSaleUnitConflict,
  replaceSale,
  salesErrorMessage,
} from "./salesModuleSupport";
import type { SaleRecord, SaleStartContext } from "./types";

export function SalesModule({
  api,
  inventoryApi,
}: {
  api?: SalesApi;
  inventoryApi?: InventoryApi;
}) {
  const accountSession = useOptionalAccountSession();
  const [runtimeApi, setRuntimeApi] = useState<SalesApi | null>(api ?? null);
  const [runtimeInventoryApi, setRuntimeInventoryApi] =
    useState<InventoryApi | null>(inventoryApi ?? null);
  const [contextOptions, setContextOptions] = useState<SaleContextOptionsState>(
    { kind: "loading", options: emptySaleContextOptions },
  );
  const [sales, setSales] = useState<readonly SaleRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "workspace">("list");
  const [message, setMessage] = useState<string | null>(null);
  const [isStartingSale, setIsStartingSale] = useState(false);
  const startContextUsed = useRef(false);
  const initialListLoadRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      setRuntimeInventoryApi(inventoryApi ?? null);
      return;
    }
    let isActive = true;
    void Promise.all([
      createSalesApiOptions(),
      createInventoryApiOptions(),
    ]).then(([salesOptions, inventoryOptions]) => {
      if (!isActive) return;
      setRuntimeApi(createSalesApi(salesOptions));
      setRuntimeInventoryApi(createInventoryApi(inventoryOptions));
    });
    return () => {
      isActive = false;
    };
  }, [api, inventoryApi]);

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
      message?.includes("venda em andamento") ||
      message?.includes("excluída")
    ) {
      timer = setTimeout(() => setMessage(null), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message]);

  useEffect(() => {
    initialListLoadRef.current = loadSales();
  }, [loadSales]);

  const resumeExistingSale = useCallback(
    async (context: SaleStartContext) => {
      if (!runtimeApi) return undefined;
      try {
        const result = await runtimeApi.list({
          status: "all",
          ...(context.unitId ? { unitId: context.unitId } : {}),
        });
        const existing = findCurrentSaleForContext(result, context);
        if (!existing) return undefined;
        setSales((current) => {
          const missing = result.filter(
            (sale) => !current.some((item) => item.id === sale.id),
          );
          return [...missing, ...current];
        });
        setActiveId(existing.id);
        setViewMode("workspace");
        setMessage(
          "Este veículo já tem uma venda em andamento. Abrimos a venda existente.",
        );
        return existing;
      } catch {
        return undefined;
      }
    },
    [runtimeApi],
  );

  const createDraft = useCallback(
    async (context = parseSaleStartContext()) => {
      if (!runtimeApi) return undefined;
      try {
        const sale = await runtimeApi.createDraft(
          createDraftFromContext(context),
        );
        setSales((current) => [sale, ...current]);
        setActiveId(sale.id);
        setViewMode("workspace");
        setMessage("Rascunho criado");
        return sale;
      } catch (error) {
        if (isSaleUnitConflict(error)) {
          const resumed = await resumeExistingSale(context);
          if (resumed) return resumed;
        }
        setMessage(salesErrorMessage(error));
        return undefined;
      }
    },
    [resumeExistingSale, runtimeApi],
  );

  useEffect(() => {
    if (!runtimeApi || startContextUsed.current) return;
    const context = parseSaleStartContext();
    if (!context.leadId && !context.unitId && !context.listingId) return;
    startContextUsed.current = true;
    setIsStartingSale(true);
    void (initialListLoadRef.current ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => createDraft(context))
      .then((sale) => {
        if (sale) clearSaleStartContext();
      })
      .finally(() => setIsStartingSale(false));
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

      {isStartingSale ? (
        <FeatureLoadingState title="Preparando a venda" />
      ) : viewMode === "list" ? (
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
          inventoryApi={runtimeInventoryApi}
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
