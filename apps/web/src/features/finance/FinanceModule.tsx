import { useEffect, useMemo, useRef, useState } from "react";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import { cancelEntry, exportFinanceCsv, updateEntryFromDraft } from "./financeBillsActions";
import { FinanceBillsFilters } from "./FinanceBillsFilters";
import { FinanceBillsHeader } from "./FinanceBillsHeader";
import { FinanceBillsSummary } from "./FinanceBillsSummary";
import { CommissionRulesPanel } from "./FinanceCorePanels";
import { FinanceEntryModal } from "./FinanceEntryModal";
import { FinanceEntryTable } from "./FinanceEntryTable";
import { FinanceRecurringBillsPanel } from "./FinanceRecurringBillsPanel";
import { FinanceTypeTabs } from "./FinanceTypeTabs";
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
  const [activeType, setActiveType] = useState(defaultActiveType);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [recurringEntries, setRecurringEntries] = useState<FinanceRecurringEntry[]>([]);
  const [runtimeApi, setRuntimeApi] = useState<FinanceApi | null>(api ?? null);
  const [filters, setFilters] = useState<FinanceFilters>(initialFinanceFilters);
  const [toast, setToast] = useState<FinanceToast | null>(null);
  const [listState, setListState] = useState<FinanceListState>({ kind: "loading" });
  const [refreshToken, setRefreshToken] = useState(0);
  const [modalEntry, setModalEntry] = useState<FinanceEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const filteredEntries = useMemo(
    () => filterEntries(entries, filters),
    [entries, filters],
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
        setEntries(payload.entries);
        setRecurringEntries(payload.recurringEntries);
        setListState({ kind: "ready" });
      })
      .catch((error) => {
        setEntries([]);
        setListState({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, [activeType, refreshToken, runtimeApi]);

  const refresh = () => setRefreshToken((current) => current + 1);

  const submitDraft = async (draft: FinanceEntryDraft) => {
    if (!runtimeApi) return;
    try {
      if (modalEntry) {
        await updateEntryFromDraft(runtimeApi, modalEntry.id, draft);
        setToast({ kind: "success", title: "Lancamento salvo", message: draft.name });
      } else if (draft.recurrence === "recurring") {
        await runtimeApi.createRecurringEntry(toRecurringInput(draft));
        setToast({ kind: "success", title: "Recorrencia criada", message: draft.name });
      } else {
        await runtimeApi.createEntryFlow(toEntryInput(draft));
        setToast({ kind: "success", title: "Lancamento criado", message: draft.name });
      }
      refresh();
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
        title: "Erro ao salvar",
      });
      throw error;
    }
  };

  return (
    <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6">
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
      <FinanceBillsSummary
        entries={filteredEntries}
        onViewAll={() => tableRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
      <FinanceBillsFilters filters={filters} onChange={setFilters} />
      {toast ? <FinanceToastMessage toast={toast} /> : null}
      <div ref={tableRef}>
        <FinanceEntryTable
          entries={filteredEntries}
          isLoading={listState.kind === "loading"}
          onCancel={(entry) => void cancelEntry(runtimeApi, entry, refresh, setToast)}
          onCreate={() => setIsModalOpen(true)}
          onEdit={(entry) => {
            setModalEntry(entry);
            setIsModalOpen(true);
          }}
          onMarkPending={(entry) =>
            void runtimeApi?.updateEntry(entry.id, { paidAt: null, status: "pending" }).then(refresh)
          }
          onPay={(entry) => void runtimeApi?.payEntry(entry.id).then(refresh)}
        />
      </div>
      <FinanceRecurringBillsPanel items={recurringEntries} />
      {activeType === "commission" ? (
        <CommissionRulesPanel
          items={commissionRules}
          onCreate={(input) => void runtimeApi?.createCommissionRule(input).then(refresh)}
        />
      ) : null}
      {listState.kind === "error" ? (
        <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-danger">
          {listState.message}
        </p>
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
    </main>
  );
}

function FinanceToastMessage({ toast }: { toast: FinanceToast }) {
  return (
    <div className="rounded-lg border border-line bg-accent-soft p-3 text-sm font-black text-accent-strong">
      {toast.title}: {toast.message}
    </div>
  );
}
