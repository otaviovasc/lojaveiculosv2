import { Ban, CalendarClock, Pencil, Repeat2 } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import { financeStatusLabels } from "./FinanceFormParts";
import {
  formatCurrency,
  formatDate,
  formatFinanceCategory,
  recurrenceLabel,
} from "./financeBillsFormat";
import type { FinanceRecurringEntry } from "./types";

export function FinanceRecurringBillsPanel({
  canUpdate = false,
  items,
  onCancel,
  onEdit,
}: {
  canUpdate?: boolean;
  items: FinanceRecurringEntry[];
  onCancel?: (entry: FinanceRecurringEntry) => void;
  onEdit?: (entry: FinanceRecurringEntry) => void;
}) {
  const isEmpty = items.length === 0;
  const sectionLayout = isEmpty
    ? {
        className: "flex h-full flex-col",
        headerClassName: "p-5",
        padding: "none" as const,
      }
    : { padding: "default" as const };

  return (
    <FeatureSection
      {...sectionLayout}
      description="Regras recorrentes com próximo vencimento, frequência e valor."
      icon={<Repeat2 className="size-5" />}
      title="Recorrências"
    >
      <div
        className={
          isEmpty
            ? "min-h-0 flex-1"
            : "mt-3 grid gap-x-8 gap-y-1 md:grid-cols-2"
        }
      >
        {!isEmpty ? (
          items.map((entry) => {
            const exhaustedAt = entry.metadata?.exhaustedAt;
            const occurrences = entry.metadata?.occurrences;
            const generatedCount = entry.metadata?.generatedCount;
            return (
              <article className="finance-recurring-card" key={entry.id}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-black text-app-text">
                      {entry.name}
                    </strong>
                    <span className="finance-recurring-card__meta">
                      {recurrenceLabel(entry)} ·{" "}
                      {formatFinanceCategory(entry.category)}
                    </span>
                  </div>
                  <strong className="finance-recurring-card__amount shrink-0">
                    {formatCurrency(entry.amountCents)}
                  </strong>
                </div>
                <div className="finance-recurring-card__foot">
                  <span className="finance-recurring-card__due">
                    <CalendarClock aria-hidden="true" className="size-3.5" />
                    {formatDate(entry.nextDueAt)}
                    {typeof occurrences === "number" ? (
                      <em>
                        {typeof generatedCount === "number"
                          ? generatedCount
                          : 0}{" "}
                        de {occurrences} gerados
                      </em>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <FeatureStatusBadge
                      size="dense"
                      tone={exhaustedAt ? "success" : "neutral"}
                    >
                      {exhaustedAt
                        ? "Concluída"
                        : financeStatusLabels[entry.status]}
                    </FeatureStatusBadge>
                    {canUpdate && (onEdit || onCancel) ? (
                      <span className="flex items-center gap-1">
                        {onEdit ? (
                          <FeatureRowAction
                            ariaLabel={`Editar recorrência ${entry.name}`}
                            icon={Pencil}
                            onClick={() => onEdit(entry)}
                            tooltip="Editar"
                          />
                        ) : null}
                        {onCancel ? (
                          <FeatureRowAction
                            ariaLabel={`Cancelar recorrência ${entry.name}`}
                            disabled={entry.status === "cancelled"}
                            icon={Ban}
                            onClick={() => onCancel(entry)}
                            tooltip="Cancelar"
                          />
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <FeatureEmptyState
            body="Cadastre uma recorrência para acompanhar os próximos vencimentos."
            className="h-full w-full"
            density="compact"
            icon={Repeat2}
            title="Nenhuma recorrência encontrada"
          />
        )}
      </div>
    </FeatureSection>
  );
}
