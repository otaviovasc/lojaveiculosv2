import { Ban, Pencil, Repeat2 } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
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
  return (
    <FeatureSection
      description="Regras recorrentes com próximo vencimento, frequência e valor."
      icon={<Repeat2 className="size-5" />}
      title="Recorrências"
    >
      <div className="mt-3 grid gap-2">
        {items.length ? (
          items.map((entry) => {
            const exhaustedAt = entry.metadata?.exhaustedAt;
            const occurrences = entry.metadata?.occurrences;
            const generatedCount = entry.metadata?.generatedCount;
            return (
              <article
                className="rounded-lg border border-line bg-app p-3 finance-recurring-card"
                key={entry.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-black text-app-text">
                      {entry.name}
                    </strong>
                    <span className="text-xs font-bold text-muted">
                      {recurrenceLabel(entry)} ·{" "}
                      {formatFinanceCategory(entry.category)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <FeatureStatusBadge
                      size="dense"
                      tone={exhaustedAt ? "success" : "neutral"}
                    >
                      {exhaustedAt
                        ? "Concluída"
                        : financeStatusLabels[entry.status]}
                    </FeatureStatusBadge>
                    {canUpdate && (onEdit || onCancel) ? (
                      <div className="flex items-center gap-2">
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
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-muted">
                  <span>{formatDate(entry.nextDueAt)}</span>
                  {typeof occurrences === "number" ? (
                    <span>
                      {typeof generatedCount === "number" ? generatedCount : 0}{" "}
                      de {occurrences} gerados
                    </span>
                  ) : null}
                  <span className="text-sm font-black text-app-text tabular-nums">
                    {formatCurrency(entry.amountCents)}
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted">
            Nenhuma recorrência cadastrada.
          </p>
        )}
      </div>
    </FeatureSection>
  );
}
