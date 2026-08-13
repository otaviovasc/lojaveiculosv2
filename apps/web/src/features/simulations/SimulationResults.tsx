import "../../styles/credere-results.css";
import { useState } from "react";
import {
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  Check,
  Copy,
  Landmark,
  RefreshCw,
  Trophy,
} from "lucide-react";
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
  const sortedAccepted = [...accepted].sort(
    (left, right) =>
      (left.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) -
        (right.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) ||
      (left.installments ?? 0) - (right.installments ?? 0),
  );
  const reasonGuidance = getCredereReasonGuidance(simulation.reason);

  return (
    <section aria-labelledby="credere-result-title" className="credere-results">
      <header className="credere-results-header">
        <div className="credere-results-heading">
          <span className="credere-results-eyebrow">Retorno dos bancos</span>
          <h3 id="credere-result-title" className="credere-results-title">
            Resultado da simulação
          </h3>
          <p className="credere-results-subtitle">
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

      <div className="credere-results-body">
        <div className="credere-results-statusline">
          <FeatureStatusBadge tone={statusTone(simulation.status)}>
            {simulationStatusLabel(simulation.status)}
          </FeatureStatusBadge>
          {simulation.createdAt ? (
            <span className="credere-results-timestamp">
              Criada em {formatDateTime(simulation.createdAt)}
            </span>
          ) : null}
          {isPolling ? (
            <span className="credere-results-polling" role="status">
              <span
                aria-hidden="true"
                className="credere-results-polling-dot"
              />
              Atualizando automaticamente a cada 5 segundos.
            </span>
          ) : null}
        </div>

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
          <p className="credere-results-reason">{simulation.reason}</p>
        ) : null}

        {simulation.conditions.length ? (
          <dl className="credere-results-hero">
            <div className="credere-results-stat credere-results-stat--hero">
              <div
                aria-hidden="true"
                className="credere-results-stat-watermark"
              >
                <Banknote />
              </div>
              <dt>
                <BadgeDollarSign aria-hidden="true" />
                {sortedAccepted.length
                  ? "Menor parcela retornada"
                  : "Condição disponível"}
              </dt>
              <dd className="credere-results-stat-value">
                {sortedAccepted.length
                  ? formatCents(
                      sortedAccepted[0]?.firstInstallmentCents ?? null,
                    )
                  : "Nenhuma"}
              </dd>
              {sortedAccepted[0] ? (
                <dd className="credere-results-stat-caption">
                  {sortedAccepted[0].bankName ??
                    sortedAccepted[0].bankCode ??
                    "Banco"}
                  {sortedAccepted[0].installments != null
                    ? ` · ${sortedAccepted[0].installments}x`
                    : ""}
                </dd>
              ) : (
                <dd className="credere-results-stat-caption">
                  nenhum banco retornou oferta
                </dd>
              )}
            </div>
            <div className="credere-results-stat">
              <dt>
                <Landmark aria-hidden="true" />
                Condições disponíveis
              </dt>
              <dd className="credere-results-stat-value">{accepted.length}</dd>
              <dd className="credere-results-stat-caption">
                ofertas para comparar
              </dd>
            </div>
            <div className="credere-results-stat">
              <dt>
                <CalendarClock aria-hidden="true" />
                Ocorrências
              </dt>
              <dd className="credere-results-stat-value">{refused.length}</dd>
              <dd className="credere-results-stat-caption">
                retornos sem condição
              </dd>
            </div>
          </dl>
        ) : null}

        {simulation.conditions.length === 0 ? (
          <div className="credere-results-empty">
            <Landmark aria-hidden="true" />
            <p>O provedor ainda não retornou condições para esta simulação.</p>
          </div>
        ) : sortedAccepted.length ? (
          <ol
            aria-label="Ofertas ordenadas pela menor parcela retornada"
            className="credere-results-offers"
          >
            {sortedAccepted.map((condition, index) => (
              <ConditionCard
                condition={condition}
                isBest={index === 0 && sortedAccepted.length > 1}
                key={conditionResultRenderKey(sortedAccepted, index)}
                position={index + 1}
              />
            ))}
          </ol>
        ) : null}

        {refused.length ? <RefusedConditions conditions={refused} /> : null}
      </div>
    </section>
  );
}

function ConditionCard({
  condition,
  isBest,
  position,
}: {
  condition: CredereSimulationCondition;
  isBest: boolean;
  position: number;
}) {
  const [copied, setCopied] = useState(false);
  const bankName = condition.bankName ?? condition.bankCode ?? "Banco";

  const handleCopy = () => {
    void navigator.clipboard?.writeText(
      [
        bankName,
        condition.installments == null ? null : `${condition.installments}x`,
        `Parcela: ${formatCents(condition.firstInstallmentCents)}`,
        `Entrada: ${formatCents(condition.downPaymentCents)}`,
        `Financiado: ${formatCents(condition.totalAmountCents)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li
      className={
        isBest
          ? "credere-results-offer credere-results-offer--best"
          : "credere-results-offer"
      }
    >
      <span aria-hidden="true" className="credere-results-offer-rank">
        {String(position).padStart(2, "0")}
      </span>
      <div className="credere-results-offer-main">
        <div className="credere-results-offer-bank">
          <strong>{bankName}</strong>
          {isBest ? (
            <span className="credere-results-offer-tag">
              <Trophy aria-hidden="true" />
              Melhor parcela
            </span>
          ) : null}
        </div>
        <dl className="credere-results-offer-facts">
          <div>
            <dt>Entrada</dt>
            <dd>{formatCents(condition.downPaymentCents)}</dd>
          </div>
          <div>
            <dt>Total financiado</dt>
            <dd>{formatCents(condition.totalAmountCents)}</dd>
          </div>
        </dl>
        {(condition.summary ??
        condition.reason ??
        condition.reasonIdentifier) ? (
          <p className="credere-results-offer-note">
            {condition.summary ??
              condition.reason ??
              condition.reasonIdentifier}
          </p>
        ) : null}
      </div>
      <div className="credere-results-offer-deal">
        <div className="credere-results-offer-installment">
          <span>Parcela estimada</span>
          <strong>{formatCents(condition.firstInstallmentCents)}</strong>
          <small>
            {condition.installments == null
              ? "Prazo não informado"
              : `em ${condition.installments} parcelas`}
          </small>
        </div>
        <div className="credere-results-offer-actions">
          <FeatureStatusBadge size="dense" tone={statusTone(condition.status)}>
            {simulationStatusLabel(condition.status)}
          </FeatureStatusBadge>
          <button
            aria-label={`Copiar condição de ${bankName}`}
            className={
              copied
                ? "credere-results-offer-copy credere-results-offer-copy--copied"
                : "credere-results-offer-copy"
            }
            onClick={handleCopy}
            title="Copiar resumo da condição"
            type="button"
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </li>
  );
}

function RefusedConditions({
  conditions,
}: {
  conditions: readonly GroupedCredereRefusal[];
}) {
  return (
    <details className="credere-results-refusals">
      <summary>
        Ocorrências dos bancos ({conditions.length} motivo
        {conditions.length === 1 ? "" : "s"})
      </summary>
      <div className="credere-results-refusal-list">
        {conditions.map((condition, index) => {
          const detail = condition.reason ?? condition.summary;
          const guidance = getCredereReasonGuidance(detail);
          return (
            <article
              className="credere-results-refusal"
              key={conditionResultRenderKey(conditions, index, "refused")}
            >
              <div className="credere-results-refusal-body">
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
                <div className="credere-results-refusal-terms">
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
    case "denied":
    case "error":
    case "failed":
    case "refused":
    case "rejected":
    case "unavailable":
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
