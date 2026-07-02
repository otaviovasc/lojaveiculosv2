import type { ReactNode } from "react";
import AnimatedContent from "./AnimatedContent";
import { AnimatedCounter } from "./CountUp";
import { cx, type FeatureIcon } from "./featureShared";

type FeatureKpiTone = "blue" | "green" | "pink" | "violet";

export function FeatureKpiStrip({
  ariaLabel,
  children,
  className,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={cx("flex flex-wrap gap-3", className)}
      role="group"
    >
      {children}
    </div>
  );
}

export function FeatureKpiCard({
  active = false,
  animationIndex,
  disabled,
  icon: IconComponent,
  label,
  onClick,
  tone,
  value,
}: {
  active?: boolean;
  animationIndex?: number;
  disabled?: boolean | undefined;
  icon: FeatureIcon;
  label: string;
  onClick?: (() => void) | undefined;
  tone: FeatureKpiTone;
  value: number | string;
}) {
  const body = (
    <KpiCardButton
      active={active}
      disabled={disabled}
      icon={IconComponent}
      label={label}
      onClick={onClick}
      tone={tone}
      value={value}
    />
  );

  if (animationIndex === undefined) return body;

  return (
    <AnimatedContent
      className="flex min-w-[min(100%,12rem)] flex-[1_1_12rem]"
      distance={20}
      delay={animationIndex * 0.04}
      duration={0.6}
      ease="power2.out"
    >
      {body}
    </AnimatedContent>
  );
}

function KpiCardButton({
  active,
  disabled,
  icon: IconComponent,
  label,
  onClick,
  tone,
  value,
}: {
  active: boolean;
  disabled?: boolean | undefined;
  icon: FeatureIcon;
  label: string;
  onClick?: (() => void) | undefined;
  tone: FeatureKpiTone;
  value: number | string;
}) {
  const className = cx(
    "kpi-card-premium flex items-center gap-3 !p-3 !px-4 !rounded-xl",
    gradientClass(tone),
    "w-full min-w-[min(100%,12rem)] flex-[1_1_12rem] border border-white/10 shadow-sm text-left transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.015]",
    onClick && "cursor-pointer",
    active && "ring-2 ring-accent/70 ring-offset-2 ring-offset-app",
    disabled && "cursor-not-allowed opacity-70",
  );
  const content = (
    <>
      <div className="gloss-overlay" />
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/15 border border-line/20 dark:border-white/10 relative z-10">
        <IconComponent aria-hidden="true" className="size-4.5 kpi-card-icon" />
      </div>
      <div className="min-w-0 relative z-10">
        <span className="block text-xs font-black uppercase tracking-wider kpi-card-label leading-none">
          {label}
        </span>
        <strong className="block text-lg font-black kpi-card-value mt-1.5 leading-none">
          {typeof value === "number" ? (
            <AnimatedCounter value={value} />
          ) : (
            value
          )}
        </strong>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label={`Filtrar por ${label}`}
        aria-pressed={active}
        className={className}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}

function gradientClass(tone: FeatureKpiTone) {
  if (tone === "green") return "kpi-gradient-green";
  if (tone === "blue") return "kpi-gradient-blue";
  if (tone === "violet") return "kpi-gradient-violet";
  return "kpi-gradient-pink";
}
