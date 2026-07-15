import type { ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

type FeatureMetricTone = "blue" | "danger" | "green" | "warning";

export function FeatureMetricCard({
  actionLabel,
  detailLabel,
  detailValue,
  icon: Icon,
  label,
  onClick,
  tone,
  value,
}: {
  actionLabel?: string;
  detailLabel: ReactNode;
  detailValue: ReactNode;
  icon: FeatureIcon;
  label: ReactNode;
  onClick?: () => void;
  tone: FeatureMetricTone;
  value: ReactNode;
}) {
  const className = cx(
    "feature-metric-card relative flex h-full min-w-0 flex-col rounded-lg border border-line bg-panel p-3.5 text-left transition-colors",
    onClick &&
      "cursor-pointer hover:border-line-strong focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
  );
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        <span
          className={cx(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
            toneClass(tone),
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <strong className="feature-metric-card__value mt-2 block min-w-0 whitespace-nowrap text-base font-bold tracking-tight text-app-text tabular-nums sm:text-lg">
        {value}
      </strong>
      <span className="mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-line/60 pt-2 text-xs">
        <span className="font-semibold text-muted">{detailLabel}</span>
        <strong className="min-w-0 whitespace-nowrap font-semibold text-app-text tabular-nums">
          {detailValue}
        </strong>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label={actionLabel}
        className={className}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}

function toneClass(tone: FeatureMetricTone) {
  if (tone === "green") {
    return "border-success-strong/20 bg-green-soft text-success-strong";
  }
  if (tone === "danger") {
    return "border-danger/20 bg-danger/10 text-danger";
  }
  if (tone === "warning") {
    return "border-warning-strong/20 bg-warning/10 text-warning-strong";
  }
  return "border-blue-start/20 bg-blue-soft text-blue-start";
}
