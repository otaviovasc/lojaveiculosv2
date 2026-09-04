import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { cx } from "../../components/ui/featureShared";
import { urgentFinanceEntries } from "./financeCashFlowModel";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";

const VISIBLE_ROWS = 3;
const EXPAND_BATCH = 10;

export function FinanceUrgencyPanel({
  entries,
  onEdit,
  onViewAll,
}: {
  entries: readonly FinanceEntry[];
  onEdit: (entry: FinanceEntry) => void;
  onViewAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_ROWS + EXPAND_BATCH);

  const urgent = urgentFinanceEntries(entries);
  if (urgent.top.length === 0) return null;
  const hasOverdue = urgent.overdue.length > 0;
  const focus = hasOverdue ? urgent.overdue : urgent.upcoming;
  const rows = expanded
    ? focus.slice(0, visibleCount)
    : urgent.top.slice(0, VISIBLE_ROWS);
  const remaining = focus.length - rows.length;

  return (
    <section
      aria-label={hasOverdue ? "Atenção imediata" : "Próximos vencimentos"}
      className={cx(
        "finance-urgency-alert",
        hasOverdue
          ? "finance-urgency-alert--danger"
          : "finance-urgency-alert--warning",
      )}
    >
      <header className="finance-urgency-alert__header">
        <span aria-hidden="true" className="finance-urgency-alert__icon">
          {hasOverdue ? (
            <AlertTriangle className="size-4" />
          ) : (
            <CalendarClock className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-app-text">
            {hasOverdue
              ? `${urgent.overdue.length} conta(s) vencida(s) — Atenção!`
              : `${urgent.upcoming.length} conta(s) a pagar nos próximos 7 dias`}
          </h3>
          <p className="text-xs font-bold text-muted">
            Total: {formatCurrency(sumEntries(focus))}
          </p>
        </div>
        <button
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-lg border border-line bg-panel px-3 text-xs font-black text-app-text transition-colors hover:border-line-strong"
          onClick={onViewAll}
          type="button"
        >
          Ver tabela
        </button>
      </header>

      <div
        className={cx(
          "finance-urgency-alert__rows",
          expanded && "max-h-[22rem] overflow-y-auto",
        )}
      >
        {rows.map((entry) => (
          <UrgencyRow entry={entry} key={entry.id} onEdit={onEdit} />
        ))}
        {expanded && remaining > 0 ? (
          <UrgencyLoadMore
            onLoadMore={() => setVisibleCount((count) => count + EXPAND_BATCH)}
          />
        ) : null}
      </div>

      {remaining > 0 || expanded ? (
        <button
          aria-expanded={expanded}
          className="finance-urgency-alert__footer w-full cursor-pointer transition-colors hover:text-app-text"
          onClick={() => {
            setExpanded((current) => !current);
            setVisibleCount(VISIBLE_ROWS + EXPAND_BATCH);
          }}
          type="button"
        >
          {expanded ? (
            <span className="inline-flex items-center gap-1">
              <ChevronUp aria-hidden="true" className="size-3.5" />
              Mostrar menos
            </span>
          ) : (
            `+${remaining} outra(s) conta(s) para acompanhar — ver todas`
          )}
        </button>
      ) : null}
    </section>
  );
}

function UrgencyLoadMore({ onLoadMore }: { onLoadMore: () => void }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      {
        root: sentinel.closest(".finance-urgency-alert__rows"),
        rootMargin: "80px",
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="px-4 py-2 text-center" ref={sentinelRef}>
      <button
        className="text-xs font-black text-muted transition-colors hover:text-accent cursor-pointer"
        onClick={onLoadMore}
        type="button"
      >
        Carregar mais...
      </button>
    </div>
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
    <article className="flex min-w-0 items-center gap-3 px-4 py-3 finance-urgency-row">
      <span
        aria-hidden="true"
        className={cx(
          "finance-urgency-alert__day",
          overdue
            ? "finance-urgency-alert__day--danger"
            : "finance-urgency-alert__day--warning",
        )}
      >
        <CalendarDays className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <strong className="truncate text-sm font-black text-app-text">
            {entry.name}
          </strong>
          <FeatureStatusBadge
            size="dense"
            tone={overdue ? "danger" : "warning"}
          >
            {overdue ? "Vencida" : "Urgente"}
          </FeatureStatusBadge>
        </div>
        <p className="mt-0.5 text-xs font-bold text-muted">
          {relativeDueLabel(days)} · {formatDate(entry.dueAt)}
        </p>
      </div>
      <strong className="shrink-0 text-sm font-black text-danger tabular-nums">
        {formatCurrency(entry.amountCents)}
      </strong>
      <FeatureRowAction
        ariaLabel={`Editar ${entry.name}`}
        icon={Pencil}
        onClick={() => onEdit(entry)}
        tooltip="Editar"
      />
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
