import { Repeat2, Sigma } from "lucide-react";
import { useState } from "react";
import type { FinanceRecurringEntry, FinanceSummary } from "./types";
import {
  FinanceDateField,
  FinanceField,
  FinanceInput,
  FinancePanel,
  FinanceSelect,
} from "./FinanceFormParts";

export function FinanceSummaryPanel({
  summary,
}: {
  summary: FinanceSummary | null;
}) {
  const items = summary
    ? [
        ["Receitas", summary.revenueAmountCents],
        ["Gastos", summary.expenseAmountCents],
        ["Comissões", summary.commissionAmountCents],
        ["Pendente", summary.pendingAmountCents],
        ["Pago", summary.paidAmountCents],
        ["Vencido", summary.overdueAmountCents],
      ]
    : [];

  return (
    <FinancePanel icon={<Sigma className="size-5" />} title="Resumo financeiro">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(items.length ? items : [["Carregando", 0]]).map(([label, value]) => (
          <div className="rounded-lg border border-line bg-app p-3" key={label}>
            <p className="text-xs font-black uppercase text-muted">{label}</p>
            <p className="mt-1 text-lg font-black text-app-text">
              {formatCurrency(Number(value))}
            </p>
          </div>
        ))}
      </div>
    </FinancePanel>
  );
}

export function FinanceRecurringPanel({
  items,
  onCreate,
}: {
  items: FinanceRecurringEntry[];
  onCreate: (input: RecurringDraft) => void;
}) {
  const [nextDueAt, setNextDueAt] = useState("");

  return (
    <FinancePanel icon={<Repeat2 className="size-5" />} title="Recorrências">
      <form
        className="grid gap-3 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!nextDueAt) return;
          const data = new FormData(event.currentTarget);
          onCreate({
            amountCents: Math.round(Number(data.get("amount")) * 100),
            category: String(data.get("category") || "Operacional"),
            frequency: String(
              data.get("frequency"),
            ) as RecurringDraft["frequency"],
            name: String(data.get("name") || "Recorrência"),
            nextDueAt: new Date(`${nextDueAt}T12:00:00`).toISOString(),
            type: String(data.get("type")) as RecurringDraft["type"],
          });
          setNextDueAt("");
          event.currentTarget.reset();
        }}
      >
        <FinanceField label="Nome">
          <FinanceInput name="name" required />
        </FinanceField>
        <FinanceField label="Categoria">
          <FinanceInput name="category" required />
        </FinanceField>
        <FinanceField label="Valor">
          <FinanceInput
            min="0"
            name="amount"
            required
            step="0.01"
            type="number"
          />
        </FinanceField>
        <FinanceField label="Próximo">
          <FinanceDateField
            label="Próximo"
            name="nextDueAt"
            onChange={setNextDueAt}
            value={nextDueAt}
          />
        </FinanceField>
        <FinanceField label="Frequência">
          <FinanceSelect
            defaultValue="monthly"
            name="frequency"
            options={[
              { label: "Mensal", value: "monthly" },
              { label: "Semanal", value: "weekly" },
              { label: "Anual", value: "yearly" },
            ]}
          />
        </FinanceField>
        <input name="type" type="hidden" value="expense" />
        <button
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-black text-accent-foreground md:col-span-5"
          disabled={!nextDueAt}
          type="submit"
        >
          Criar recorrência
        </button>
      </form>
      <p className="mt-3 text-sm font-bold text-muted">
        {items.length} recorrências cadastradas.
      </p>
    </FinancePanel>
  );
}

export type RecurringDraft = {
  amountCents: number;
  category: string;
  frequency: "monthly" | "weekly" | "yearly";
  name: string;
  nextDueAt: string;
  type: "commission" | "expense" | "revenue";
};

function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valueCents / 100);
}

export { CommissionRulesPanel } from "./CommissionRulesPanel";
