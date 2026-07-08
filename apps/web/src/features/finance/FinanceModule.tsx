import { useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import {
  cancelEntry,
  exportFinanceCsv,
  updateEntryFromDraft,
} from "./financeBillsActions";
import { FinanceBillsFilters } from "./FinanceBillsFilters";
import { FinanceBillsHeader } from "./FinanceBillsHeader";
import { FinanceCashFlowInsights } from "./FinanceCashFlowInsights";
import { FinanceCashFlowOverview } from "./FinanceCashFlowOverview";
import { CommissionRulesPanel } from "./FinanceCorePanels";
import { CommissionWorkspace } from "./CommissionWorkspace";
import { FinanceEntryModal } from "./FinanceEntryModal";
import { FinanceEntryTable } from "./FinanceEntryTable";
import { FinanceRecurringBillsPanel } from "./FinanceRecurringBillsPanel";
import { FinanceTypeTabs } from "./FinanceTypeTabs";
import { FinanceUrgencyPanel } from "./FinanceUrgencyPanel";
import { createFinanceApiOptions } from "./runtimeApi";
import {
  filterEntries,
  initialFinanceFilters,
  loadFinanceWorkspace,
  toEntryInput,
  toRecurringInput,
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
}: {
  api?: FinanceApi;
  defaultActiveType?: FinanceEntryType;
}) {
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
  const activeEntries = entriesByType[activeType];
  const allEntries = useMemo(
    () => [
      ...entriesByType.expense,
      ...entriesByType.revenue,
      ...entriesByType.commission,
    ],
    [entriesByType],
  );
  const filteredEntries = useMemo(
    () => filterEntries(activeEntries, filters),
    [activeEntries, filters],
  );
  const filteredCashEntries = useMemo(
    () => filterEntries(allEntries, filters),
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
    void loadFinanceWorkspace(runtimeApi, activeType)
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
  }, [activeType, refreshToken, runtimeApi]);

  const refresh = () => setRefreshToken((current) => current + 1);
  const scrollToTable = () =>
    tableRef.current?.scrollIntoView({ behavior: "smooth" });

  const submitDraft = async (draft: FinanceEntryDraft) => {
    if (!runtimeApi) return;
    try {
      if (modalEntry) {
        await updateEntryFromDraft(runtimeApi, modalEntry, draft);
        setToast({
          kind: "success",
          title: "Lançamento salvo",
          message: draft.name,
        });
      } else if (draft.recurrence === "recurring") {
        await runtimeApi.createRecurringEntry(toRecurringInput(draft));
        setToast({
          kind: "success",
          title: "Recorrência criada",
          message: draft.name,
        });
      } else {
        await runtimeApi.createEntryFlow(toEntryInput(draft));
        setToast({
          kind: "success",
          title: "Lançamento criado",
          message: draft.name,
        });
      }
      refresh();
    } catch (error) {
      setToast({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível salvar o lançamento.",
        ),
        title: "Erro ao salvar",
      });
      throw error;
    }
  };

  return (
    <FeaturePageShell variant="plain">
      <FinanceBillsHeader
        onCreate={() => {
          setModalEntry(null);
          setIsModalOpen(true);
        }}
        onExport={() => exportFinanceCsv(filteredEntries, activeType)}
        onReports={() => (window.location.hash = "#/reports")}
      />
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
        entries={filteredCashEntries}
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
        entries={filteredCashEntries}
        onEdit={(entry) => {
          setActiveType(entry.type);
          setModalEntry(entry);
          setIsModalOpen(true);
        }}
        onViewAll={scrollToTable}
      />
      {toast ? <FinanceToastMessage toast={toast} /> : null}
      <div ref={tableRef}>
        <FinanceEntryTable
          entries={filteredEntries}
          isLoading={listState.kind === "loading"}
          onCancel={setCancelTarget}
          onCreate={() => setIsModalOpen(true)}
          onEdit={(entry) => {
            setModalEntry(entry);
            setIsModalOpen(true);
          }}
          onMarkPending={(entry) =>
            void runtimeApi
              ?.updateEntry(entry.id, { paidAt: null, status: "pending" })
              .then(refresh)
          }
          onPay={(entry) => void runtimeApi?.payEntry(entry.id).then(refresh)}
        />
      </div>
      <FinanceRecurringBillsPanel items={recurringEntries} />
      <FinanceCashFlowInsights
        commissionRules={commissionRules}
        entries={filteredCashEntries}
        recurringEntries={recurringEntries}
      />
      {activeType === "commission" ? (
        <CommissionRulesPanel
          items={commissionRules}
          onCreate={(input) =>
            void runtimeApi?.createCommissionRule(input).then(refresh)
          }
        />
      ) : null}
      {listState.kind === "error" ? (
        <FeatureAlert className="feature-alert text-danger">
          {listState.message}
        </FeatureAlert>
      ) : null}
      <FinanceEntryModal
        activeType={activeType}
        entry={modalEntry}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalEntry(null);
        }}
        onSubmit={submitDraft}
      />
      <ConfirmDialog
        confirmLabel="Cancelar lançamento"
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          await cancelEntry(runtimeApi, cancelTarget, refresh, setToast);
          setCancelTarget(null);
        }}
        title="Cancelar lançamento?"
        variant="destructive"
        {...(cancelTarget
          ? {
              description: `O lançamento "${cancelTarget.name}" ficará cancelado e preservado para auditoria.`,
            }
          : {})}
      />
    </FeaturePageShell>
  );
}

function FinanceToastMessage({ toast }: { toast: FinanceToast }) {
  return (
    <div className="rounded-lg border border-line bg-accent-soft p-3 text-sm font-black text-accent-strong">
      {toast.title}: {toast.message}
    </div>
  );
}
