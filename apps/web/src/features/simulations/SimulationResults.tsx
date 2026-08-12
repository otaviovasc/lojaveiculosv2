import { RefreshCw } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import {
  conditionResultRenderKey,
  getCredereReasonGuidance,
  simulationStatusLabel,
  splitSimulationConditions,
  type GroupedCredereRefusal,
} from "./simulationPresentation";
import type { CredereSimulation, CredereSimulationCondition } from "./types";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const REFRESHABLE_STATUSES = new Set([
  "indeterminate",
  "pending",
  "processing",
  "submitted",
  "requested",
]);

export function isProcessingStatus(status: string) {
  return REFRESHABLE_STATUSES.has(status.trim().toLowerCase());
}

export function SimulationResults({
  isPolling,
  isRefreshing,
  onRefresh,
  pollError,
  pollExhausted,
  simulation,
}: {
  isPolling: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  pollError: string | null;
  pollExhausted: boolean;
  simulation: CredereSimulation;
}) {
  const refreshable = isProcessingStatus(simulation.status);
  const isIndeterminate =
    simulation.status.trim().toLowerCase() === "indeterminate" ||
    (!refreshable && simulation.success === null);
  const showRefresh = refreshable || isIndeterminate;
  const { accepted, refused } = splitSimulationConditions(
    simulation.conditions,
  );
  const reasonGuidance = getCredereReasonGuidance(simulation.reason);

  return (
    <section aria-labelledby="credere-result-title" className="credere-results">
      <header className="credere-pane-header">
        <div>
          <span className="credere-section-label">Retorno dos bancos</span>
          <h3 id="credere-result-title">Resultado da simulação</h3>
          <p>
            O Credere apresenta uma pré-análise. A aprovação final depende da
            validação do banco e não é garantida por esta tela.
          </p>
        </div>
        {showRefresh ? (
          <FeatureActionButton
            disabled={isRefreshing}
            icon={RefreshCw}
            isBusy={isRefreshing}
            label="Atualizar status"
            onClick={onRefresh}
            title="Consultar o provedor novamente"
          />
        ) : null}
      </header>

      <div className="credere-result-body">
        <div className="credere-result-meta">
          <FeatureStatusBadge tone={statusTone(simulation.status)}>
            {simulationStatusLabel(simulation.status)}
          </FeatureStatusBadge>
          {simulation.createdAt ? (
            <span className="text-xs font-bold text-muted">
              Criada em {formatDateTime(simulation.createdAt)}
            </span>
          ) : null}
        </div>

        {isPolling ? (
          <p className="credere-polling-note" role="status">
            Atualizando automaticamente a cada 5 segundos.
          </p>
        ) : null}

        {pollExhausted ? (
          <FeatureAlert title="Atualização automática pausada" tone="warning">
            O limite de consultas automáticas foi atingido e o resultado segue
            indeterminado. Use “Atualizar status” para consultar novamente; isto
            não significa aprovação nem recusa.
          </FeatureAlert>
        ) : null}

        {pollError ? (
          <FeatureAlert
            title="Atualização automática interrompida"
            tone="warning"
          >
            {pollError} Use “Atualizar status” para tentar novamente; nenhuma
            aprovação ou recusa foi inferida.
          </FeatureAlert>
        ) : null}

        {isIndeterminate ? (
          <FeatureAlert title="Resultado indeterminado" tone="warning">
            O backend ainda não confirmou sucesso ou falha para esta consulta.
            Revise o retorno dos bancos e atualize o status antes de orientar o
            cliente.
          </FeatureAlert>
        ) : null}

        {reasonGuidance ? (
          <FeatureAlert title={reasonGuidance.title} tone="info">
            {reasonGuidance.body}
          </FeatureAlert>
        ) : null}

        {simulation.reason ? (
          <p className="credere-provider-reason">{simulation.reason}</p>
        ) : null}

        {simulation.conditions.length === 0 ? (
          <p className="credere-results-empty">
            O provedor ainda não retornou condições para esta simulação.
          </p>
        ) : accepted.length ? (
          <div className="credere-table-wrap">
            <table className="credere-table">
              <thead>
                <tr>
                  <th>Banco</th>
                  <th>Pré-análise</th>
                  <th>Prazo</th>
                  <th>Total</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {accepted.map((condition, index) => (
                  <ConditionRow
                    condition={condition}
                    key={conditionResultRenderKey(accepted, index)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {refused.length ? <RefusedConditions conditions={refused} /> : null}
      </div>
    </section>
  );
}

function ConditionRow({
  condition,
}: {
  condition: CredereSimulationCondition;
}) {
  return (
    <tr>
      <td className="credere-bank-name">
        {condition.bankName ?? condition.bankCode ?? "—"}
      </td>
      <td>
        <FeatureStatusBadge size="dense" tone={statusTone(condition.status)}>
          {simulationStatusLabel(condition.status)}
        </FeatureStatusBadge>
      </td>
      <td>
        {condition.installments != null ? `${condition.installments}x` : "—"}
      </td>
      <td>{formatCents(condition.totalAmountCents)}</td>
      <td className="credere-condition-detail">
        {condition.summary ?? condition.reason ?? "—"}
      </td>
    </tr>
  );
}

function RefusedConditions({
  conditions,
}: {
  conditions: readonly GroupedCredereRefusal[];
}) {
  return (
    <details className="credere-refusals">
      <summary>
        Ocorrências dos bancos ({conditions.length} motivo
        {conditions.length === 1 ? "" : "s"})
      </summary>
      <div className="credere-refusal-list">
        {conditions.map((condition, index) => {
          const detail = condition.reason ?? condition.summary;
          const guidance = getCredereReasonGuidance(detail);
          return (
            <article
              className="credere-refusal-row"
              key={conditionResultRenderKey(conditions, index, "refused")}
            >
              <div>
                <strong>
                  {condition.bankName ?? condition.bankCode ?? "Banco"}
                </strong>
                <p>{detail ?? "O banco não informou o motivo."}</p>
                {condition.occurrences > 1 ? (
                  <small>
                    Mesmo motivo em {condition.occurrences} condições.
                  </small>
                ) : null}
                {guidance ? <small>{guidance.body}</small> : null}
              </div>
              {condition.affectedInstallments.length ? (
                <div className="credere-refusal-terms">
                  <span>Prazos afetados</span>
                  <strong>
                    {condition.affectedInstallments
                      .map((term) => `${term}x`)
                      .join(", ")}
                  </strong>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </details>
  );
}

function statusTone(status: string) {
  switch (status.trim().toLowerCase()) {
    case "available":
      return "success" as const;
    case "failed":
    case "rejected":
      return "danger" as const;
    case "pending":
    case "processing":
    case "submitted":
    case "requested":
    case "indeterminate":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function formatCents(cents: number | null) {
  return cents == null ? "—" : brlFormatter.format(cents / 100);
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
