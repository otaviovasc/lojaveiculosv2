import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";
import type {
  InventoryChecklistOverview,
  InventoryChecklistOverviewFilter,
} from "../inventory/model/checklistOverviewTypes";

function ChecklistMetricCard({
  actionLabel,
  detailLabel,
  detailValue,
  icon: Icon,
  label,
  onClick,
  tone,
  value,
  isActive,
}: {
  actionLabel?: string;
  detailLabel: React.ReactNode;
  detailValue: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  label: React.ReactNode;
  onClick?: () => void;
  tone: "blue" | "danger" | "green" | "warning";
  value: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <button
      aria-label={actionLabel}
      className={`checklist-metric-card ${isActive ? "is-active" : ""}`}
      data-tone={tone}
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        <span
          className={`checklist-metric-icon checklist-metric-icon--${tone}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <strong className="checklist-metric-value mt-2 block min-w-0 whitespace-nowrap tabular-nums">
        {value}
      </strong>
      <span className="checklist-metric-detail">
        <span className="font-semibold text-muted">{detailLabel}</span>
        <strong className="min-w-0 whitespace-nowrap font-semibold text-app-text tabular-nums">
          {detailValue}
        </strong>
      </span>
    </button>
  );
}

export function ChecklistMetrics({
  onFilter,
  overview,
  status,
}: {
  onFilter: (status: InventoryChecklistOverviewFilter) => void;
  overview: InventoryChecklistOverview;
  status: InventoryChecklistOverviewFilter;
}) {
  const { summary } = overview;
  return (
    <div className="checklist-metrics-grid">
      <ChecklistMetricCard
        actionLabel="Mostrar todas as situações"
        detailLabel="Checklists"
        detailValue={`${summary.checklistCount} criados`}
        icon={ListChecks}
        label="Veículos no recorte"
        onClick={() => onFilter("all")}
        tone="blue"
        value={summary.unitCount}
        isActive={status === "all"}
      />
      <ChecklistMetricCard
        actionLabel="Mostrar checklists concluídos"
        detailLabel="Itens resolvidos"
        detailValue={`${summary.resolvedItemCount}/${summary.itemCount}`}
        icon={CheckCircle2}
        label="Conclusão real"
        onClick={() => onFilter(status === "passed" ? "all" : "passed")}
        tone="green"
        value={`${summary.progressPercent}%`}
        isActive={status === "passed"}
      />
      <ChecklistMetricCard
        actionLabel="Mostrar veículos que exigem atenção"
        detailLabel="Itens reprovados"
        detailValue={`${summary.failedItemCount} reprovados`}
        icon={AlertTriangle}
        label="Exigem atenção"
        onClick={() => onFilter(status === "attention" ? "all" : "attention")}
        tone="danger"
        value={summary.attentionUnitCount}
        isActive={status === "attention"}
      />
      <ChecklistMetricCard
        actionLabel="Mostrar veículos sem checklist"
        detailLabel="Itens pendentes"
        detailValue={`${summary.pendingItemCount} pendentes`}
        icon={ClipboardCheck}
        label="Sem checklist"
        onClick={() => onFilter(status === "missing" ? "all" : "missing")}
        tone="warning"
        value={summary.missingChecklistUnitCount}
        isActive={status === "missing"}
      />
    </div>
  );
}
