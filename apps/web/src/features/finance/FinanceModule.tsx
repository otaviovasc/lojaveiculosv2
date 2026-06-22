import { useEffect, useMemo, useRef, useState } from "react";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import { FinanceBillsFilters } from "./FinanceBillsFilters";
import { FinanceBillsHeader } from "./FinanceBillsHeader";
import { FinanceBillsSummary } from "./FinanceBillsSummary";
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
  FinanceEntry,
  FinanceEntryType,
  FinanceRecurringEntry,
  FinanceSummary,
  UpdateFinanceEntryInput,
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
  const [recurringEntries, setRecurringEntries] = useState<FinanceRecurringEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
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
        setEntries(payload.entries);
        setRecurringEntries(payload.recurringEntries);
        setSummary(payload.summary);
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
  };

  const exportCsv = () => {
    const rows = [
      ["nome", "categoria", "status", "vencimento", "valor_centavos"],
      ...filteredEntries.map((entry) => [
        entry.name,
        entry.category,
        entry.status,
        entry.dueAt ?? "",
        String(entry.amountCents),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro-${activeType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6">
      <FinanceBillsHeader
        onCreate={() => {
          setModalEntry(null);
          setIsModalOpen(true);
        }}
        onExport={exportCsv}
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
        summary={summary}
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

async function updateEntryFromDraft(
  api: FinanceApi,
  entryId: string,
  draft: FinanceEntryDraft,
) {
  const input = toEntryInput(draft);
  const update: UpdateFinanceEntryInput = {
    amountCents: input.amountCents,
    category: input.category,
    name: input.name,
    status: input.status,
  };
  if (input.dueAt !== undefined) update.dueAt = input.dueAt;
  if (input.metadata !== undefined) update.metadata = input.metadata;
  if (input.paidAt !== undefined) update.paidAt = input.paidAt;
  if (input.sellerUserId !== undefined) {
    update.sellerUserId = input.sellerUserId;
  }
  await api.updateEntry(entryId, update);
  if (!draft.documentFile) return;
  const upload = await api.requestDocumentUpload(entryId, draft.documentFile);
  await fetch(upload.uploadUrl, {
    body: draft.documentFile,
    method: upload.uploadMethod ?? "PUT",
    ...(upload.uploadHeaders ? { headers: upload.uploadHeaders } : {}),
  });
  await api.attachDocument(entryId, {
    fileName: draft.documentFile.name,
    fileSizeBytes: draft.documentFile.size,
    kind: "finance_receipt",
    mimeType: draft.documentFile.type || "application/octet-stream",
    storageKey: upload.storageKey,
    title: draft.documentTitle.trim() || draft.documentFile.name,
  });
}

async function cancelEntry(
  api: FinanceApi | null,
  entry: FinanceEntry,
  refresh: () => void,
  setToast: (toast: FinanceToast) => void,
) {
  if (!api || !window.confirm(`Cancelar ${entry.name}?`)) return;
  await api.cancelEntry(entry.id, "Cancelado pela tela de gastos.");
  setToast({ kind: "success", title: "Lancamento cancelado", message: entry.name });
  refresh();
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
