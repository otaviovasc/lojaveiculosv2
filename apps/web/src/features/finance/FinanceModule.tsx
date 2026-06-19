import { useEffect, useState } from "react";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import {
  CommissionRulesPanel,
  FinanceSummaryPanel,
  FinanceRecurringPanel,
} from "./FinanceCorePanels";
import { FinanceEntryForm, type FinanceFormState } from "./FinanceEntryForm";
import { FinanceEntryTable } from "./FinanceEntryTable";
import { FinanceModuleHeader, FinanceTypeTabs } from "./FinanceTypeTabs";
import { createFinanceApiOptions } from "./runtimeApi";
import type {
  CommissionRule,
  FinanceEntry,
  FinanceEntryType,
  FinanceRecurringEntry,
  FinanceSummary,
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
  const [recurringEntries, setRecurringEntries] = useState<
    FinanceRecurringEntry[]
  >([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [runtimeApi, setRuntimeApi] = useState<FinanceApi | null>(api ?? null);
  const [formState, setFormState] = useState<FinanceFormState>({
    kind: "idle",
  });
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [refreshToken, setRefreshToken] = useState(0);

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
    void Promise.all([
      runtimeApi.listEntries(activeType),
      runtimeApi.getSummary(),
      runtimeApi.listRecurringEntries(),
      runtimeApi.listCommissionRules(),
    ])
      .then(([nextEntries, nextSummary, nextRecurring, nextRules]) => {
        setCommissionRules(nextRules);
        setEntries(nextEntries);
        setRecurringEntries(nextRecurring);
        setSummary(nextSummary);
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

  const submitEntry: Parameters<
    typeof FinanceEntryForm
  >[0]["onSubmit"] = async (input) => {
    if (!runtimeApi) return;

    if (!input.name || !input.category || input.amountCents <= 0) {
      setFormState({
        kind: "error",
        message: "Informe descricao, categoria e valor maior que zero.",
      });
      return;
    }

    setFormState({ kind: "submitting" });
    try {
      const result = await runtimeApi.createEntryFlow(input);
      setFormState({ entryId: result.entry.id, kind: "success" });
      setRefreshToken((current) => current + 1);
    } catch (error) {
      setFormState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const refresh = () => setRefreshToken((current) => current + 1);

  const payEntry = async (entry: FinanceEntry) => {
    if (!runtimeApi) return;
    await runtimeApi.payEntry(entry.id);
    refresh();
  };

  const cancelEntry = async (entry: FinanceEntry) => {
    if (!runtimeApi) return;
    const reason = window.prompt("Motivo do cancelamento") ?? undefined;
    await runtimeApi.cancelEntry(entry.id, reason);
    refresh();
  };

  const editEntry = async (entry: FinanceEntry) => {
    if (!runtimeApi) return;
    const name = window.prompt("Descricao", entry.name);
    if (!name) return;
    const amount = window.prompt("Valor", String(entry.amountCents / 100));
    if (!amount) return;
    await runtimeApi.updateEntry(entry.id, {
      amountCents: Math.round(Number(amount) * 100),
      name,
    });
    refresh();
  };

  return (
    <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6">
      <FinanceModuleHeader />
      <FinanceTypeTabs
        activeType={activeType}
        onTypeChange={(type) => {
          setActiveType(type);
          setFormState({ kind: "idle" });
        }}
      />

      <FinanceSummaryPanel summary={summary} />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <FinanceEntryForm
          activeType={activeType}
          onSubmit={submitEntry}
          state={formState}
        />
        <FinanceEntryTable
          entries={entries}
          isLoading={listState.kind === "loading"}
          onCancel={(entry) => void cancelEntry(entry)}
          onEdit={(entry) => void editEntry(entry)}
          onPay={(entry) => void payEntry(entry)}
          type={activeType}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FinanceRecurringPanel
          items={recurringEntries}
          onCreate={(input) => {
            if (!runtimeApi) return;
            void runtimeApi.createRecurringEntry(input).then(refresh);
          }}
        />
        <CommissionRulesPanel
          items={commissionRules}
          onCreate={(input) => {
            if (!runtimeApi) return;
            void runtimeApi.createCommissionRule(input).then(refresh);
          }}
        />
      </div>

      {listState.kind === "error" ? (
        <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-danger">
          {listState.message}
        </p>
      ) : null}
    </main>
  );
}

type ListState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };
