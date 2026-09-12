import { CheckCircle2, Clock, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import "../../styles/fiscal-shell.css";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import { hydrateEntrySellerNames } from "./commissionEntryMeta";
import { cancelEntry, exportFinanceCsv } from "./financeBillsActions";
import { FinanceBillsFilters } from "./FinanceBillsFilters";
import { FinanceBillsHeader } from "./FinanceBillsHeader";
import {
  filterEntries,
  filterOperationalCashEntries,
  initialFinanceFilters,
  loadFinanceWorkspace,
  type FinanceEntryDraft,
  type FinanceFilters,
  type FinanceListState,
  type FinanceToast,
} from "./financeBillsModel";
import { FinanceCashFlowInsights } from "./FinanceCashFlowInsights";
import { FinanceCashFlowOverview } from "./FinanceCashFlowOverview";
import { FinanceCommissionDueCards } from "./FinanceCommissionDueCards";
import { CommissionRulesPanel } from "./CommissionRulesPanel";
import { FinanceEntryDialogs } from "./FinanceEntryDialogs";
import { FinanceEntryTable } from "./FinanceEntryTable";
import {
  FinanceAccessNotice,
  FinanceLoadError,
  FinanceToastMessage,
} from "./FinanceModuleFeedback";
import {
  cancelFinanceRecurringEntry,
  submitFinanceDraft,
  updateFinanceEntryStatus,
} from "./financeModuleActions";
import { FinanceRecurringBillsPanel } from "./FinanceRecurringBillsPanel";
import { FinanceTypeTabs } from "./FinanceTypeTabs";
import { FinanceUrgencyPanel } from "./FinanceUrgencyPanel";
import { createFinanceApiOptions } from "./runtimeApi";
import type {
  CommissionRule,
  FinanceEntry,
  FinanceEntryType,
  FinanceRecurringEntry,
} from "./types";
import { useFinanceAccess } from "./useFinanceAccess";
import { openFinanceEntryReceipt } from "./financeReceiptAction";

export function FinanceEntriesWorkspace({
  api,
  onNavigate,
}: {
  api: FinanceApi | undefined;
  onNavigate: ((moduleId: "reports") => void) | undefined;
}) {
  const {
    canCreate,
    canGenerateReceipt,
    canOpenReceipt,
    canUpdate,
    sellerOptions,
    vehicleOptions,
    vehicleOptionsState,
  } = useFinanceAccess(Boolean(api), true, true);
  const [activeType, setActiveType] = useState<FinanceEntryType | "all">("all");
  const [entriesByType, setEntriesByType] = useState<
    Record<FinanceEntryType, FinanceEntry[]>
  >({
    commission: [],
    expense: [],
    revenue: [],
  });
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [recurringEntries, setRecurringEntries] = useState<
    FinanceRecurringEntry[]
  >([]);
  const [runtimeApi, setRuntimeApi] = useState<FinanceApi | null>(api ?? null);
  const [filters, setFilters] = useState<FinanceFilters>(initialFinanceFilters);
  const [toast, setToast] = useState<FinanceToast | null>(null);
  const [listState, setListState] = useState<FinanceListState>({
    kind: "loading",
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [modalEntry, setModalEntry] = useState<FinanceEntry | null>(null);
  const [modalRecurringEntry, setModalRecurringEntry] =
    useState<FinanceRecurringEntry | null>(null);
  const [cancelTarget, setCancelTarget] = useState<FinanceEntry | null>(null);
  const [cancelRecurringTarget, setCancelRecurringTarget] =
    useState<FinanceRecurringEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptActionEntryId, setReceiptActionEntryId] = useState<
    string | null
  >(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const visibleEntriesByType = useMemo(
    () => ({
      commission: hydrateEntrySellerNames(
        entriesByType.commission,
        sellerOptions,
      ),
      expense: hydrateEntrySellerNames(entriesByType.expense, sellerOptions),
      revenue: hydrateEntrySellerNames(entriesByType.revenue, sellerOptions),
    }),
    [entriesByType, sellerOptions],
  );
  const allEntries = useMemo(
    () => [
      ...visibleEntriesByType.expense,
      ...visibleEntriesByType.revenue,
      ...visibleEntriesByType.commission,
    ],
    [visibleEntriesByType],
  );
  const activeEntries = useMemo(() => {
    if (activeType === "all") {
      return [...allEntries].sort((a, b) => {
        const dateA = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const dateB = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return dateB - dateA;
      });
    }
    return visibleEntriesByType[activeType];
  }, [activeType, visibleEntriesByType, allEntries]);
  const filteredEntries = useMemo(
    () => filterEntries(activeEntries, filters),
    [activeEntries, filters],
  );
  const filteredCashEntries = useMemo(
    () => filterEntries(allEntries, filters),
    [allEntries, filters],
  );
  const operationalCashEntries = useMemo(
    () => filterOperationalCashEntries(allEntries, filters),
    [allEntries, filters],
  );
  const filteredCountsByType = useMemo(() => {
    const counts: Record<FinanceEntryType, number> = {
      commission: 0,
      expense: 0,
      revenue: 0,
    };
    for (const entry of filteredCashEntries) {
      counts[entry.type] += 1;
    }
    return counts;
  }, [filteredCashEntries]);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }
    void createFinanceApiOptions().then((options) => {
      setRuntimeApi(createFinanceApi(options));
    });
  }, [api]);

  useEffect(() => {
    if (!runtimeApi) return;
    let isCurrentRequest = true;
    setListState({ kind: "loading" });
    void loadFinanceWorkspace(runtimeApi, { materializeRecurring: canCreate })
      .then((payload) => {
        if (!isCurrentRequest) return;
        setCommissionRules(payload.commissionRules);
        setEntriesByType(payload.entriesByType);
        setRecurringEntries(payload.recurringEntries);
        setListState({ kind: "ready" });
      })
      .catch((error) => {
        if (!isCurrentRequest) return;
        setEntriesByType({ commission: [], expense: [], revenue: [] });
        setListState({
          kind: "error",
          message: formatApiErrorDisplay(
            error,
            "Não foi possível carregar o financeiro.",
          ),
        });
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [canCreate, refreshToken, runtimeApi]);

  const refresh = () => setRefreshToken((current) => current + 1);
  const scrollToTable = () =>
    tableRef.current?.scrollIntoView({ behavior: "smooth" });

  const submitDraft = async (draft: FinanceEntryDraft) => {
    if (!runtimeApi) return;
    await submitFinanceDraft(
      { api: runtimeApi, modalEntry, modalRecurringEntry, refresh, setToast },
      draft,
    );
  };

  const updateStatus = async (
    entry: FinanceEntry,
    action: "pay" | "pending",
  ) => {
    if (!runtimeApi) return;
    await updateFinanceEntryStatus(
      { api: runtimeApi, refresh, setToast },
      entry,
      action,
    );
  };

  const openReceipt = async (entry: FinanceEntry) => {
    if (!runtimeApi || receiptActionEntryId) return;
    setReceiptActionEntryId(entry.id);
    try {
      const result = await openFinanceEntryReceipt(runtimeApi, entry, {
        canGenerate: canGenerateReceipt,
      });
      if (result.kind === "missing") {
        setToast({
          kind: "error",
          message: "Nenhum recibo foi anexado a este lançamento.",
          title: "Recibo não disponível",
        });
        return;
      }
      setToast({
        kind: "success",
        message: entry.name,
        title: result.generated ? "Recibo gerado" : "Recibo aberto",
      });
    } catch (error) {
      setToast({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível abrir ou gerar o recibo.",
        ),
        title: "Erro no recibo",
      });
    } finally {
      setReceiptActionEntryId(null);
    }
  };

  const statusChip = useMemo(() => {
    if (listState.kind === "loading") {
      return (
        <>
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Carregando fluxo
        </>
      );
    }
    if (listState.kind === "error") {
      return (
        <>
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          Dados indisponíveis
        </>
      );
    }

    const pendingCount = operationalCashEntries.filter(
      (entry) => entry.status === "pending",
    ).length;
    const now = new Date();
    const overdueCount = operationalCashEntries.filter(
      (entry) =>
        entry.status === "pending" &&
        Boolean(entry.dueAt && new Date(entry.dueAt) < now),
    ).length;

    if (overdueCount > 0) {
      return (
        <>
          <Clock className="size-3.5" aria-hidden="true" />
          {overdueCount} {overdueCount === 1 ? "vencido" : "vencidos"}
        </>
      );
    }
    if (pendingCount > 0) {
      return (
        <>
          <Clock className="size-3.5" aria-hidden="true" />
          {pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}
        </>
      );
    }
    return (
      <>
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Fluxo em dia
      </>
    );
  }, [listState.kind, operationalCashEntries]);

  return (
    <FeaturePageShell className="finance-shell fiscal-shell" variant="content">
      <div aria-hidden="true" className="fiscal-shell-blob" />
      <FinanceBillsHeader
        {...(listState.kind === "ready"
          ? { onExport: () => exportFinanceCsv(filteredEntries, activeType) }
          : {})}
        canCreate={canCreate}
        chip={statusChip}
        onCreate={() => {
          setModalEntry(null);
          setModalRecurringEntry(null);
          setIsModalOpen(true);
        }}
        onRefresh={refresh}
        onReports={() =>
          onNavigate
            ? onNavigate("reports")
            : (window.location.hash = "#/reports")
        }
      />
      <FinanceAccessNotice canManage={canCreate || canUpdate} />
      <FinanceLoadError listState={listState} onRetry={refresh} />
      <FinanceCashFlowOverview
        entries={operationalCashEntries}
        onShowOverdue={() => {
          setFilters((current) => ({
            ...current,
            datePreset: "overdue",
            status: "all",
            window: "overdue",
          }));
          scrollToTable();
        }}
        onShowPending={() => {
          setFilters((current) => ({
            ...current,
            datePreset: "all",
            status: "pending",
            window: "all",
          }));
          scrollToTable();
        }}
        status={listState.kind}
      />
      {listState.kind === "ready" ? (
        <FinanceCommissionDueCards entries={visibleEntriesByType.commission} />
      ) : null}

      {listState.kind === "ready" ? (
        <FinanceUrgencyPanel
          entries={operationalCashEntries}
          onEdit={(entry) => {
            if (!canUpdate) return;
            setActiveType(entry.type);
            setModalEntry(entry);
            setModalRecurringEntry(null);
            setIsModalOpen(true);
          }}
          onViewAll={scrollToTable}
        />
      ) : null}

      {listState.kind !== "error" ? (
        <div ref={tableRef}>
          <FinanceEntryTable
            activeType={activeType}
            canCreate={canCreate}
            canGenerateReceipt={canGenerateReceipt}
            canOpenReceipt={canOpenReceipt}
            canUpdate={canUpdate}
            entries={filteredEntries}
            isLoading={listState.kind === "loading"}
            onCancel={setCancelTarget}
            onCreate={() => setIsModalOpen(true)}
            onEdit={(entry) => {
              setModalEntry(entry);
              setModalRecurringEntry(null);
              setIsModalOpen(true);
            }}
            onExport={() => exportFinanceCsv(filteredEntries, activeType)}
            onMarkPending={(entry) => void updateStatus(entry, "pending")}
            onPay={(entry) => void updateStatus(entry, "pay")}
            onReceipt={(entry) => void openReceipt(entry)}
            otherEntryCount={Math.max(
              0,
              filteredCashEntries.length - filteredEntries.length,
            )}
            receiptActionEntryId={receiptActionEntryId}
            toast={toast ? <FinanceToastMessage toast={toast} /> : null}
            filters={
              <FinanceBillsFilters
                entries={allEntries}
                filters={filters}
                onChange={setFilters}
                vehicleOptions={vehicleOptions}
                vehicleOptionsState={vehicleOptionsState}
              />
            }
            typeTabs={
              <FinanceTypeTabs
                activeType={activeType}
                counts={filteredCountsByType}
                onTypeChange={(type) => {
                  setActiveType(type);
                  setToast(null);
                }}
              />
            }
          />
        </div>
      ) : null}
      {listState.kind === "ready" &&
      activeType === "commission" &&
      canCreate ? (
        <CommissionRulesPanel
          items={commissionRules}
          onCreate={async (input) => {
            if (!runtimeApi) throw new Error("Finance API unavailable");
            await runtimeApi.createCommissionRule(input);
            refresh();
          }}
        />
      ) : null}
      {listState.kind === "ready" ? (
        <div className="finance-bottom-grid">
          <FinanceRecurringBillsPanel
            canUpdate={canUpdate}
            items={recurringEntries}
            onCancel={(entry) => setCancelRecurringTarget(entry)}
            onEdit={(entry) => {
              setModalEntry(null);
              setModalRecurringEntry(entry);
              setIsModalOpen(true);
            }}
          />
          <FinanceCashFlowInsights
            commissionRules={commissionRules}
            entries={operationalCashEntries}
            recurringEntries={recurringEntries}
          />
        </div>
      ) : null}
      <FinanceEntryDialogs
        activeType={activeType === "all" ? "expense" : activeType}
        api={runtimeApi}
        cancelRecurringTarget={cancelRecurringTarget}
        cancelTarget={cancelTarget}
        isModalOpen={isModalOpen}
        modalEntry={modalEntry}
        modalRecurringEntry={modalRecurringEntry}
        onCancelClose={() => setCancelTarget(null)}
        onCancelConfirm={async () => {
          if (!cancelTarget) return;
          await cancelEntry(runtimeApi, cancelTarget, refresh, setToast);
          setCancelTarget(null);
        }}
        onCancelRecurringClose={() => setCancelRecurringTarget(null)}
        onCancelRecurringConfirm={async () => {
          if (!runtimeApi || !cancelRecurringTarget) return;
          await cancelFinanceRecurringEntry(
            { api: runtimeApi, refresh, setToast },
            cancelRecurringTarget,
          );
          setCancelRecurringTarget(null);
        }}
        onModalClose={() => {
          setIsModalOpen(false);
          setModalEntry(null);
          setModalRecurringEntry(null);
        }}
        onSubmit={submitDraft}
        sellerOptions={sellerOptions}
        vehicleOptions={vehicleOptions}
        vehicleOptionsState={vehicleOptionsState}
      />
    </FeaturePageShell>
  );
}
