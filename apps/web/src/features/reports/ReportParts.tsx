import { LockKeyhole, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import { formatCurrency } from "../finance/financeBillsFormat";
import type { ReportAvailability } from "./types";

export function MetricDeck({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Indicadores do relatório" className="reports-metrics">
      {children}
    </section>
  );
}

export function ReportMetric({
  current,
  formatter = formatCurrency,
  label,
  previous,
  tone = "neutral",
}: {
  current: number;
  formatter?: (value: number) => string;
  label: string;
  previous?: number | undefined;
  tone?: "good" | "neutral" | "warning";
}) {
  return (
    <article className="reports-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{formatter(current)}</strong>
      {previous !== undefined ? (
        <ComparisonDelta current={current} previous={previous} />
      ) : null}
    </article>
  );
}

export function ComparisonDelta({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (current === previous) {
    return (
      <small className="reports-delta" data-direction="flat">
        <Minus aria-hidden="true" className="size-3" />
        Sem mudança
      </small>
    );
  }
  const Icon = current > previous ? TrendingUp : TrendingDown;
  const percent =
    previous === 0 ? null : Math.abs(((current - previous) / previous) * 100);
  return (
    <small
      className="reports-delta"
      data-direction={current > previous ? "up" : "down"}
    >
      <Icon aria-hidden="true" className="size-3" />
      {percent === null
        ? "Sem base anterior"
        : `${percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. anterior`}
    </small>
  );
}

export function AvailabilityPanel({
  availability,
  label,
}: {
  availability: ReportAvailability;
  label: string;
}) {
  if (availability.status === "available") return null;
  return (
    <FeatureEmptyState
      body={availability.reason}
      icon={LockKeyhole}
      title={
        availability.status === "restricted"
          ? `${label} restrito`
          : `${label} indisponível`
      }
    />
  );
}

export function BarRow({
  formatter = (amount) => amount.toLocaleString("pt-BR"),
  label,
  max,
  value,
}: {
  formatter?: (value: number) => string;
  label: string;
  max: number;
  value: number;
}) {
  return (
    <div className="reports-bar-row">
      <div className="reports-bar-row__header">
        <span>{label}</span>
        <strong>{formatter(value)}</strong>
      </div>
      <div
        aria-label={`${label}: ${value}`}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        className="reports-progress-track"
        role="progressbar"
      >
        <div
          className="reports-progress-fill"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

export const count = (value: number) => value.toLocaleString("pt-BR");
export const percent = (value: number) =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
