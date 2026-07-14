import { useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import { cancelEntry, exportFinanceCsv } from "./financeBillsActions";
import { FinanceBillsFilters } from "./FinanceBillsFilters";
import { FinanceBillsHeader } from "./FinanceBillsHeader";
import { FinanceCashFlowInsights } from "./FinanceCashFlowInsights";
import { FinanceCashFlowOverview } from "./FinanceCashFlowOverview";
import { CommissionRulesPanel } from "./FinanceCorePanels";
import { CommissionWorkspace } from "./CommissionWorkspace";
import { hydrateEntrySellerNames } from "./commissionEntryMeta";
import { FinanceEntryDialogs } from "./FinanceEntryDialogs";
import { FinanceEntryTable } from "./FinanceEntryTable";
import {
  FinanceAccessNotice,
  FinanceLoadError,
  FinanceToastMessage,
} from "./FinanceModuleFeedback";
import { FinanceRecurringBillsPanel } from "./FinanceRecurringBillsPanel";
import { FinanceTypeTabs } from "./FinanceTypeTabs";
import { FinanceUrgencyPanel } from "./FinanceUrgencyPanel";
import { createFinanceApiOptions } from "./runtimeApi";
import {
  submitFinanceDraft,
  updateFinanceEntryStatus,
} from "./financeModuleActions";
import { useFinanceAccess } from "./useFinanceAccess";
import {
  filterEntries,
  initialFinanceFilters,
  loadFinanceWorkspace,
  type FinanceEntryDraft,
  type FinanceFilters,
  type FinanceListState,
  type FinanceToast,
} from "./financeBillsModel";
import type {
  CommissionRule,
  FinanceEntry,
  FinanceEntryType,
  FinanceRecurringEntry,
} from "./types";

export function FinanceModule({
  api,
  defaultActiveType = "expense",
  onNavigate,
}: {
  api?: FinanceApi;
  defaultActiveType?: FinanceEntryType;
  onNavigate?: (moduleId: "reports") => void;
}) {
  const { canAttach, canCreate, canUpdate, sellerOptions } = useFinanceAccess(
    Boolean(api),
    defaultActiveType !== "commission",
  );

  if (defaultActiveType === "commission") {
    return api ? <CommissionWorkspace api={api} /> : <CommissionWorkspace />;
  }

  const [activeType, setActiveType] =
    useState<FinanceEntryType>(defaultActiveType);
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
  const [cancelTarget, setCancelTarget] = useState<FinanceEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const activeEntries = visibleEntriesByType[activeType];
  const allEntries = useMemo(
    () => [
      ...visibleEntriesByType.expense,
      ...visibleEntriesByType.revenue,
      ...visibleEntriesByType.commission,
    ],
    [visibleEntriesByType],
  );
  const filteredEntries = useMemo(
    () => filterEntries(activeEntries, filters),
    [activeEntries, filters],
  );
  const filteredCashEntries = useMemo(
    () => filterEntries(allEntries, filters),
    [allEntries, filters],
  );
  const operationalCashEntries = useMemo(
    () =>
      filterEntries(allEntries, {
        ...filters,
        dateFrom: "",
        datePreset: "all",
        dateTo: "",
        window: "all",
      }),
    [allEntries, filters],
  );

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
    setListState({ kind: "loading" });
    void loadFinanceWorkspace(runtimeApi)
      .then((payload) => {
        setCommissionRules(payload.commissionRules);
        setEntriesByType(payload.entriesByType);
        setRecurringEntries(payload.recurringEntries);
        setListState({ kind: "ready" });
      })
      .catch((error) => {
        setEntriesByType({ commission: [], expense: [], revenue: [] });
        setListState({
          kind: "error",
          message: formatApiErrorDisplay(
            error,
            "Não foi possível carregar o financeiro.",
          ),
        });
      });
  }, [refreshToken, runtimeApi]);

  const refresh = () => setRefreshToken((current) => current + 1);
  const scrollToTable = () =>
    tableRef.current?.scrollIntoView({ behavior: "smooth" });

  const submitDraft = async (draft: FinanceEntryDraft) => {
    if (!runtimeApi) return;
    await submitFinanceDraft(
      { api: runtimeApi, modalEntry, refresh, setToast },
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

  return (
    <FeaturePageShell variant="plain">
      <FinanceBillsHeader
        canCreate={canCreate}
        onCreate={() => {
          setModalEntry(null);
          setIsModalOpen(true);
        }}
        onExport={() => exportFinanceCsv(filteredEntries, activeType)}
        onReports={() =>
          onNavigate
            ? onNavigate("reports")
            : (window.location.hash = "#/reports")
        }
      />
      <FinanceAccessNotice canManage={canCreate || canUpdate} />
      <FinanceTypeTabs
        activeType={activeType}
        onTypeChange={(type) => {
          setActiveType(type);
          setToast(null);
        }}
      />
      <FinanceBillsFilters
        entries={allEntries}
        filters={filters}
        onChange={setFilters}
      />
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
      />
      <FinanceUrgencyPanel
        entries={operationalCashEntries}
        onEdit={(entry) => {
          if (!canUpdate) return;
          setActiveType(entry.type);
          setModalEntry(entry);
          setIsModalOpen(true);
        }}
        onViewAll={scrollToTable}
      />
      {toast ? <FinanceToastMessage toast={toast} /> : null}
      <div ref={tableRef}>
        <FinanceEntryTable
          activeType={activeType}
          canAttach={canAttach}
          canCreate={canCreate}
          canUpdate={canUpdate}
          entries={filteredEntries}
          isLoading={listState.kind === "loading"}
          onCancel={setCancelTarget}
          onCreate={() => setIsModalOpen(true)}
          onEdit={(entry) => {
            setModalEntry(entry);
            setIsModalOpen(true);
          }}
          onMarkPending={(entry) => void updateStatus(entry, "pending")}
          onPay={(entry) => void updateStatus(entry, "pay")}
          otherEntryCount={Math.max(
            0,
            filteredCashEntries.length - filteredEntries.length,
          )}
        />
      </div>
      <FinanceRecurringBillsPanel items={recurringEntries} />
      <FinanceCashFlowInsights
        commissionRules={commissionRules}
        entries={filteredCashEntries}
        recurringEntries={recurringEntries}
      />
      {activeType === "commission" && canCreate ? (
        <CommissionRulesPanel
          items={commissionRules}
          onCreate={async (input) => {
            if (!runtimeApi) throw new Error("Finance API unavailable");
            await runtimeApi.createCommissionRule(input);
            refresh();
          }}
        />
      ) : null}
      <FinanceLoadError listState={listState} />
      <FinanceEntryDialogs
        activeType={activeType}
        cancelTarget={cancelTarget}
        isModalOpen={isModalOpen}
        modalEntry={modalEntry}
        onCancelClose={() => setCancelTarget(null)}
        onCancelConfirm={async () => {
          if (!cancelTarget) return;
          await cancelEntry(runtimeApi, cancelTarget, refresh, setToast);
          setCancelTarget(null);
        }}
        onModalClose={() => {
          setIsModalOpen(false);
          setModalEntry(null);
        }}
        onSubmit={submitDraft}
        sellerOptions={sellerOptions}
      />
    </FeaturePageShell>
  );
}
