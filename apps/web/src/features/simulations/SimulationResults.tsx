import "../../styles/credere-results.css";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Banknote,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Landmark,
  PlusCircle,
  RefreshCw,
  Share2,
  Trophy,
} from "lucide-react";
import { FeatureSegmentedControl } from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import {
  conditionResultRenderKey,
  formatBankName,
  formatCredereReason,
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

type SortOption = "installment_asc" | "down_payment_asc" | "approval";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Menor Parcela", value: "installment_asc" },
  { label: "Menor Entrada", value: "down_payment_asc" },
  { label: "Melhor Aprovação", value: "approval" },
];

export function SimulationResults({
  isPolling,
  isRefreshing,
  onBack,
  onNewSimulation,
  onRefresh,
  pollError,
  pollExhausted,
  simulation,
}: {
  isPolling: boolean;
  isRefreshing: boolean;
  onBack?: () => void;
  onNewSimulation?: () => void;
  onRefresh: () => void;
  pollError: string | null;
  pollExhausted: boolean;
  simulation: CredereSimulation;
}) {
  const [sortBy, setSortBy] = useState<SortOption>("installment_asc");
  const [copiedAll, setCopiedAll] = useState(false);

  // Automatically scroll to the top of results when loaded/changed
  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, [simulation.id]);

  const refreshable = isProcessingStatus(simulation.status);
  const isIndeterminate =
    simulation.status.trim().toLowerCase() === "indeterminate" ||
    (!refreshable && simulation.success === null);
  const showRefresh = refreshable || isIndeterminate;

  const { accepted, refused } = splitSimulationConditions(
    simulation.conditions,
  );

  const sortedAccepted = useMemo(() => {
    const list = [...accepted];
    switch (sortBy) {
      case "down_payment_asc":
        return list.sort(
          (a, b) =>
            (a.downPaymentCents ?? Number.MAX_SAFE_INTEGER) -
              (b.downPaymentCents ?? Number.MAX_SAFE_INTEGER) ||
            (a.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) -
              (b.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER),
        );
      case "approval":
        return list.sort(
          (a, b) =>
            (b.preApprovalStatus ?? 0) - (a.preApprovalStatus ?? 0) ||
            (a.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) -
              (b.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER),
        );
      case "installment_asc":
      default:
        return list.sort(
          (left, right) =>
            (left.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) -
              (right.firstInstallmentCents ?? Number.MAX_SAFE_INTEGER) ||
            (left.installments ?? 0) - (right.installments ?? 0),
        );
    }
  }, [accepted, sortBy]);

  const hasAccepted = accepted.length > 0;
  const isPending = isProcessingStatus(simulation.status);
  const reasonGuidance = getCredereReasonGuidance(simulation.reason);

  const uniqueBanksCount = useMemo(() => {
    const names = new Set(
      simulation.conditions
        .map((c) => c.bankName ?? c.bankCode)
        .filter(Boolean),
    );
    return names.size;
  }, [simulation.conditions]);

  const handleShareAll = () => {
    if (!sortedAccepted.length) return;
    const lines = sortedAccepted.map((c, i) => {
      const bank = formatBankName(c.bankName, c.bankCode);
      const term = c.installments ? `${c.installments}x de ` : "";
      const val = formatCents(c.firstInstallmentCents);
      const entry = c.downPaymentCents
        ? ` (Entrada: ${formatCents(c.downPaymentCents)})`
        : "";
      return `${i + 1}. ${bank}: ${term}${val}${entry}`;
    });
    const text = `Propostas de Financiamento Credere:\n\n${lines.join("\n")}`;
    void navigator.clipboard?.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <section
      aria-labelledby="credere-result-title"
      className="flex flex-col gap-6 rounded-2xl border border-line bg-panel p-5 sm:p-7 md:p-8 shadow-sm transition-all animate-fade-in"
    >
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-5">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-app-elevated/80 px-4 py-2 text-xs font-bold text-app-text transition-all hover:border-line-strong hover:bg-app-elevated"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="size-4" />
              <span>Voltar</span>
            </button>
          ) : null}

          {onNewSimulation ? (
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-app-elevated/80 px-4 py-2 text-xs font-bold text-app-text transition-all hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong"
              onClick={onNewSimulation}
              type="button"
            >
              <PlusCircle className="size-4" />
              <span>Nova simulação</span>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isPolling ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400"
              role="status"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-amber-500 animate-pulse"
              />
              Atualizando em tempo real
            </span>
          ) : null}

          {hasAccepted ? (
            <button
              className={
                copiedAll
                  ? "inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2.5 text-xs font-black text-emerald-400 transition-all"
                  : "inline-flex items-center gap-2 rounded-xl border border-line bg-app-elevated/80 px-4 py-2.5 text-xs font-black text-app-text transition-all hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong active:scale-98"
              }
              onClick={handleShareAll}
              title="Copiar resumo de todas as propostas para WhatsApp ou cliente"
              type="button"
            >
              {copiedAll ? (
                <>
                  <Check className="size-4 text-emerald-400" />
                  <span>Propostas copiadas!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>Copiar todas as propostas</span>
                </>
              )}
            </button>
          ) : null}

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
        </div>
      </div>

      {/* Hero Banner Header */}
      <div
        className={
          hasAccepted
            ? "relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/85 via-emerald-900/50 to-panel p-6 shadow-sm sm:p-8 text-app-text"
            : isPending
              ? "relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/85 via-amber-900/50 to-panel p-6 shadow-sm sm:p-8 text-app-text"
              : "relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-app-elevated/80 to-panel p-6 shadow-sm sm:p-8 text-app-text"
        }
      >
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={
                  hasAccepted
                    ? "flex size-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-400 backdrop-blur-md"
                    : isPending
                      ? "flex size-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/20 text-amber-400 backdrop-blur-md"
                      : "flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-panel text-muted"
                }
              >
                {hasAccepted ? (
                  <CheckCircle2 className="size-7" />
                ) : isPending ? (
                  <RefreshCw className="size-7 animate-spin" />
                ) : (
                  <AlertTriangle className="size-7" />
                )}
              </div>
              <div>
                <h2
                  className="font-display text-2xl font-black tracking-tight text-app-text"
                  id="credere-result-title"
                >
                  {hasAccepted
                    ? "Simulação Finalizada"
                    : isPending
                      ? "Processando Simulação"
                      : "Simulação Processada"}
                </h2>
                <p className="text-sm font-semibold text-muted">
                  {hasAccepted
                    ? "Análise de crédito concluída com sucesso junto aos bancos parceiros"
                    : isPending
                      ? "Consultando bancos autorizados em tempo real..."
                      : "Análise processada, sem propostas aprovadas pelos bancos"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FeatureStatusBadge tone={statusTone(simulation.status)}>
                {simulationStatusLabel(simulation.status)}
              </FeatureStatusBadge>
              {simulation.createdAt ? (
                <span className="text-xs font-semibold text-muted">
                  Criada em {formatDateTime(simulation.createdAt)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 border-t border-line/40 pt-5 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Status da Consulta
              </span>
              <div className="inline-flex items-center gap-2 text-sm font-bold text-app-text">
                <span
                  className={
                    hasAccepted
                      ? "size-2 rounded-full bg-emerald-500"
                      : isPending
                        ? "size-2 rounded-full bg-amber-500 animate-pulse"
                        : "size-2 rounded-full bg-muted"
                  }
                />
                Oficial Credere
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Bancos Respondentes
              </span>
              <span className="text-sm font-bold text-app-text">
                {uniqueBanksCount} banco{uniqueBanksCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Condições Disponíveis
              </span>
              <span className="text-sm font-bold text-app-text">
                {accepted.length} proposta{accepted.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Menor Parcela
              </span>
              <span className="font-display text-base font-black text-emerald-600 dark:text-emerald-400">
                {sortedAccepted.length
                  ? formatCents(
                      sortedAccepted[0]?.firstInstallmentCents ?? null,
                    )
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
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
        <p className="border-l-2 border-line-strong pl-3 text-xs font-bold text-muted">
          {simulation.reason}
        </p>
      ) : null}

      {/* Hero Stats Dl (Maintained for layout consistency & tests) */}
      {simulation.conditions.length ? (
        <dl className="credere-results-hero">
          <div className="credere-results-stat credere-results-stat--hero">
            <div aria-hidden="true" className="credere-results-stat-watermark">
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
                ? formatCents(sortedAccepted[0]?.firstInstallmentCents ?? null)
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

      {/* Proposals Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-lg font-black text-app-text">
            <Building2 className="size-5 text-accent-strong" />
            <span>Propostas Retornadas</span>
          </h3>

          {hasAccepted ? (
            <FeatureSegmentedControl
              ariaLabel="Ordenar propostas"
              onChange={setSortBy}
              options={SORT_OPTIONS}
              value={sortBy}
            />
          ) : null}
        </div>

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
  const bankName = formatBankName(condition.bankName, condition.bankCode);

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

  const preApprovalLabel =
    condition.preApprovalStatus === 3
      ? "Alta Probabilidade"
      : condition.preApprovalStatus === 2
        ? "Chance de Aprovação"
        : condition.preApprovalStatus === 1
          ? "Crédito Restrito"
          : null;

  const reasonDetail =
    condition.summary ?? condition.reason ?? condition.reasonIdentifier;

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
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl border border-line/60 bg-app-elevated/80 text-accent-strong">
              <Landmark className="size-4.5" />
            </div>
            <strong className="text-sm font-black text-app-text">
              {bankName}
            </strong>
          </div>

          {isBest ? (
            <span className="credere-results-offer-tag">
              <Trophy aria-hidden="true" />
              Melhor parcela
            </span>
          ) : null}

          {preApprovalLabel ? (
            <span
              className={
                condition.preApprovalStatus === 3
                  ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400"
                  : condition.preApprovalStatus === 2
                    ? "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-black uppercase text-amber-600 dark:text-amber-400"
                    : "inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-black uppercase text-rose-600 dark:text-rose-400"
              }
            >
              {preApprovalLabel}
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
        {reasonDetail ? (
          <p className="credere-results-offer-note">
            {formatCredereReason(reasonDetail)}
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
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <FeatureStatusBadge size="dense" tone={statusTone(condition.status)}>
            {simulationStatusLabel(condition.status)}
          </FeatureStatusBadge>
          <button
            aria-label={`Copiar condição de ${bankName}`}
            className={
              copied
                ? "inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-all"
                : "inline-flex items-center gap-1.5 rounded-xl border border-line bg-app-elevated/80 px-3 py-1.5 text-xs font-bold text-app-text transition-all hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong active:scale-98"
            }
            onClick={handleCopy}
            title="Copiar resumo da proposta para área de transferência"
            type="button"
          >
            {copied ? (
              <>
                <Check className="size-3.5" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copiar Proposta</span>
              </>
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
          const rawDetail = condition.reason ?? condition.summary;
          const translatedReason = formatCredereReason(
            rawDetail,
            condition.reasonIdentifier,
          );
          const guidance = getCredereReasonGuidance(rawDetail);
          const bankName = formatBankName(
            condition.bankName,
            condition.bankCode,
          );
          return (
            <article
              className="credere-results-refusal"
              key={conditionResultRenderKey(conditions, index, "refused")}
            >
              <div className="credere-results-refusal-body">
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-muted" />
                  <strong>{bankName}</strong>
                </div>
                <p>{translatedReason}</p>
                {condition.occurrences > 1 ? (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-full border border-line/60 bg-panel px-2.5 py-0.5 text-xs font-bold text-muted">
                      Mesmo motivo em {condition.occurrences} condições.
                    </span>
                  </div>
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
