import { AlertTriangle, CalendarClock, Pencil } from "lucide-react";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { urgentFinanceEntries } from "./financeCashFlowModel";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";

export function FinanceUrgencyPanel({
  entries,
  onEdit,
  onViewAll,
}: {
  entries: readonly FinanceEntry[];
  onEdit: (entry: FinanceEntry) => void;
  onViewAll: () => void;
}) {
  const urgent = urgentFinanceEntries(entries);
  if (urgent.top.length === 0) return null;
  const hasOverdue = urgent.overdue.length > 0;

  return (
    <FeatureSection
      actions={
        <button
          className="rounded-lg border border-line bg-app px-3 py-2 text-xs font-black text-app-text"
          onClick={onViewAll}
          type="button"
        >
          Ver tabela
        </button>
      }
      description="Contas pendentes vencidas ou com vencimento nos próximos 7 dias."
      icon={
        hasOverdue ? (
          <AlertTriangle className="size-5" />
        ) : (
          <CalendarClock className="size-5" />
        )
      }
      title={hasOverdue ? "Atenção imediata" : "Próximos vencimentos"}
    >
      <div className="grid gap-3 lg:grid-cols-[0.34fr_1fr] finance-urgency-wrapper">
        <div
          className="rounded-lg border border-line bg-app p-4 finance-urgency-summary-card"
          data-has-overdue={hasOverdue}
        >
          <FeatureStatusBadge tone={hasOverdue ? "danger" : "warning"}>
            {hasOverdue
              ? `${urgent.overdue.length} vencido(s)`
              : `${urgent.upcoming.length} próximo(s)`}
          </FeatureStatusBadge>
          <strong className="mt-3 block text-2xl font-black text-app-text">
            {formatCurrency(
              sumEntries(hasOverdue ? urgent.overdue : urgent.upcoming),
            )}
          </strong>
          <p className="mt-1 text-sm font-bold text-muted">
            {hasOverdue
              ? "Resolva ou reprograme os lançamentos vencidos."
              : "Prepare pagamentos da próxima semana."}
          </p>
        </div>
        <div className="grid gap-2 finance-urgency-rows">
          {urgent.top.map((entry) => (
            <UrgencyRow entry={entry} key={entry.id} onEdit={onEdit} />
          ))}
        </div>
      </div>
    </FeatureSection>
  );
}

function UrgencyRow({
  entry,
  onEdit,
}: {
  entry: FinanceEntry;
  onEdit: (entry: FinanceEntry) => void;
}) {
  const dueAt = entry.dueAt ? new Date(entry.dueAt) : null;
  const days = dueAt ? daysFromToday(dueAt) : null;
  const overdue = days !== null && days < 0;

  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app p-3 finance-urgency-row">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <strong className="truncate text-sm font-black text-app-text">
            {entry.name}
          </strong>
          <FeatureStatusBadge tone={overdue ? "danger" : "warning"}>
            {relativeDueLabel(days)}
          </FeatureStatusBadge>
        </div>
        <p className="mt-1 text-xs font-bold text-muted">
          {formatDate(entry.dueAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <strong className="text-sm font-black text-danger">
          {formatCurrency(entry.amountCents)}
        </strong>
        <FeatureRowAction
          ariaLabel={`Editar ${entry.name}`}
          icon={Pencil}
          onClick={() => onEdit(entry)}
          tooltip="Editar"
        />
      </div>
    </article>
  );
}

function relativeDueLabel(days: number | null) {
  if (days === null) return "Sem data";
  if (days < 0) return `Venceu há ${Math.abs(days)}d`;
  if (days === 0) return "Vence hoje";
  return `Vence em ${days}d`;
}

function daysFromToday(value: Date) {
  const today = startOfDay(new Date());
  const date = startOfDay(value);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function sumEntries(entries: readonly FinanceEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.amountCents, 0);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
