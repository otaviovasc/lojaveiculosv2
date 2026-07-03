import { Repeat2 } from "lucide-react";
import {
  FinanceBadge,
  FinancePanel,
  financeStatusLabels,
} from "./FinanceFormParts";
import {
  formatCurrency,
  formatDate,
  formatFinanceCategory,
  recurrenceLabel,
} from "./financeBillsFormat";
import type { FinanceRecurringEntry } from "./types";

export function FinanceRecurringBillsPanel({
  items,
}: {
  items: FinanceRecurringEntry[];
}) {
  return (
    <FinancePanel icon={<Repeat2 className="size-5" />} title="Recorrências">
      <div className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted">
        Recorrências podem ser criadas e listadas com auditoria. Edição, pausa e
        exclusão de regras seguem como pendências da fase atual.
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.length ? (
          items.map((entry) => (
            <article
              className="rounded-lg border border-line bg-app p-3"
              key={entry.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-black text-app-text">
                    {entry.name}
                  </strong>
                  <span className="text-xs font-bold text-muted">
                    {recurrenceLabel(entry)}
                  </span>
                </div>
                <FinanceBadge>{financeStatusLabels[entry.status]}</FinanceBadge>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-bold text-muted sm:grid-cols-3">
                <span>{formatFinanceCategory(entry.category)}</span>
                <span>{formatDate(entry.nextDueAt)}</span>
                <span className="text-right text-app-text">
                  {formatCurrency(entry.amountCents)}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-line bg-app p-4 text-sm font-bold text-muted">
            Nenhuma recorrência cadastrada.
          </p>
        )}
      </div>
    </FinancePanel>
  );
}
