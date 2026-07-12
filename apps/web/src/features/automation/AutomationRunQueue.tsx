import { Bot, ChevronDown, Clock3 } from "lucide-react";
import { FeatureCard } from "../../components/ui/FeatureCards";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import {
  automationStatusLabel,
  automationStatusTone,
  formatAutomationDate,
} from "./automationModel";
import type { AutomationRunSummary } from "./types";

export function AutomationRunQueue({
  hasMore,
  isLoading,
  isLoadingMore,
  onLoadMore,
  onSelect,
  runs,
  selectedRunId,
  totalCount,
}: {
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
  onSelect: (runId: string) => void;
  runs: AutomationRunSummary[];
  selectedRunId: string | null;
  totalCount: number;
}) {
  return (
    <FeatureCard className="automation-rail">
      <header className="automation-panel-heading">
        <div>
          <span>Fila operacional</span>
          <h2>Prévias recentes</h2>
        </div>
        <span
          aria-label={`${totalCount} automações no total`}
          className="automation-count"
        >
          {totalCount}
        </span>
      </header>

      <div
        aria-busy={isLoading || isLoadingMore}
        className="automation-run-list"
      >
        {isLoading && runs.length === 0 ? (
          <FeatureLoadingState
            className="automation-rail-state"
            icon={Clock3}
            title="Carregando fila"
          />
        ) : runs.length === 0 ? (
          <div className="automation-rail-state">
            <Bot aria-hidden="true" className="size-6" />
            <strong>Nenhuma prévia criada</strong>
            <p>Descreva um objetivo para gerar o primeiro plano auditável.</p>
          </div>
        ) : (
          runs.map((run) => (
            <button
              aria-current={selectedRunId === run.id ? "true" : undefined}
              className="automation-run-item"
              data-active={selectedRunId === run.id}
              key={run.id}
              onClick={() => onSelect(run.id)}
              type="button"
            >
              <span className="automation-run-item-topline">
                <FeatureStatusBadge tone={automationStatusTone(run.status)}>
                  {automationStatusLabel(run.status)}
                </FeatureStatusBadge>
                <time dateTime={run.updatedAt}>
                  {formatAutomationDate(run.updatedAt)}
                </time>
              </span>
              <strong>{run.objective}</strong>
              <span className="automation-run-item-meta">
                {run.stepCount} etapa{run.stepCount === 1 ? "" : "s"}
                <span aria-hidden="true">·</span>
                {run.pendingApprovalCount} pendente
                {run.pendingApprovalCount === 1 ? "" : "s"}
              </span>
            </button>
          ))
        )}
      </div>
      {runs.length > 0 ? (
        <footer className="automation-queue-footer">
          <span>
            {runs.length} de {totalCount} carregadas
          </span>
          {hasMore ? (
            <FeatureActionButton
              icon={ChevronDown}
              isBusy={isLoadingMore}
              label="Carregar mais prévias"
              onClick={() => void onLoadMore()}
            />
          ) : null}
        </footer>
      ) : null}
    </FeatureCard>
  );
}
