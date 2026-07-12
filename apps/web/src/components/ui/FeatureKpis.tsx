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
      className={cx(
        "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3",
        className,
      )}
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
      className="flex min-w-0 sm:min-w-[12rem] sm:flex-[1_1_12rem]"
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
    "feature-kpi-card kpi-card-premium flex min-h-20 items-center gap-2 !rounded-xl !p-3 sm:min-h-0 sm:gap-3 sm:!px-4",
    gradientClass(tone),
    "w-full min-w-0 border border-white/10 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.015] sm:min-w-[12rem] sm:flex-[1_1_12rem]",
    onClick && "cursor-pointer",
    active && "ring-2 ring-accent/70 ring-offset-2 ring-offset-app",
    disabled && "cursor-not-allowed opacity-70",
  );
  const content = (
    <>
      <div className="gloss-overlay" />
      <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line/20 bg-black/5 sm:size-9 dark:border-white/10 dark:bg-white/15">
        <IconComponent aria-hidden="true" className="size-4.5 kpi-card-icon" />
      </div>
      <div className="min-w-0 relative z-10">
        <span className="kpi-card-label block text-xs font-black uppercase leading-tight tracking-wide sm:leading-none sm:tracking-wider">
          {label}
        </span>
        <strong className="feature-kpi-card__value kpi-card-value mt-1.5 block text-base font-black leading-none sm:text-lg">
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
