import type { ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

type FeatureCardTone =
  "accent" | "blue" | "danger" | "green" | "neutral" | "violet" | "warning";

export function FeatureCard({
  ariaLabel,
  children,
  className,
  padding,
  surface = "panel",
}: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  padding: "comfortable" | "compact" | "none";
  surface?: "custom" | "panel";
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={cx(
        "rounded-lg border shadow-[var(--shadow-panel)]",
        surface === "panel" && "border-line bg-panel",
        padding === "comfortable" && "p-5 md:p-6",
        padding === "compact" && "p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function FeatureCardHeader({
  actions,
  children,
  className,
  icon,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cx("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0">{children}</div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function FeatureCardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cx("text-base font-bold text-app-text", className)}>
      {children}
    </h3>
  );
}

export function FeatureCardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cx("text-sm font-medium text-muted", className)}>
      {children}
    </p>
  );
}

export function FeatureStatCard({
  appearance = "default",
  ariaLabel,
  className,
  density = "default",
  hint,
  icon: IconComponent,
  label,
  onClick,
  tone = "neutral",
  value,
}: {
  appearance?: "default" | "tinted";
  ariaLabel?: string;
  className?: string;
  density?: "compact" | "default";
  hint?: ReactNode;
  icon?: FeatureIcon;
  label: ReactNode;
  onClick?: () => void;
  tone?: FeatureCardTone;
  value: ReactNode;
}) {
  const cardClassName = cx(
    "feature-stat-card relative min-w-0 transition-colors hover:border-line-strong",
    density === "default" &&
      "block p-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4",
    density === "compact" &&
      "feature-stat-card--compact flex items-center justify-between gap-2 p-2 sm:p-3",
    appearance === "tinted" && "feature-stat-card--tinted",
    appearance === "tinted" && statToneTintedSurfaceClass(tone),
    onClick &&
      "cursor-pointer text-left focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
    className,
  );
  const content = (
    <>
      <div className={cx("min-w-0", density === "default" && "pr-10 sm:pr-0")}>
        <span className="feature-stat-card__label block text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        <strong
          className={cx(
            "feature-stat-card__value mt-1 block whitespace-nowrap font-black leading-tight tracking-tight text-app-text tabular-nums",
            density === "default" && "feature-stat-card__value--fluid",
            density === "compact" && "text-sm sm:text-base",
          )}
        >
          {value}
        </strong>
        {hint ? (
          <span className="feature-stat-card__hint mt-1 block text-xs font-medium text-muted">
            {hint}
          </span>
        ) : null}
      </div>
      {IconComponent ? (
        appearance === "tinted" ? (
          <IconComponent
            aria-hidden="true"
            className={cx(
              "feature-stat-card__icon shrink-0",
              density === "default" &&
                "absolute right-3 top-3 size-5 sm:static sm:size-6",
              density === "compact" && "size-4 sm:size-5",
            )}
          />
        ) : (
          <div
            className={cx(
              "absolute right-3 top-3 flex size-9 shrink-0 items-center justify-center rounded-lg border sm:static sm:size-11",
              statToneSurfaceClass(tone),
              statToneIconClass(tone),
            )}
          >
            <IconComponent aria-hidden="true" className="size-4 sm:size-5" />
          </div>
        )
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        aria-label={ariaLabel}
        className={cx(
          "rounded-lg border",
          appearance === "default" && "border-line bg-panel",
          cardClassName,
        )}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <FeatureCard
      className={cardClassName}
      padding="none"
      surface={appearance === "tinted" ? "custom" : "panel"}
    >
      {content}
    </FeatureCard>
  );
}

export function FeatureList({
  children,
  className,
  inset = "none",
}: {
  children: ReactNode;
  className?: string;
  inset?: "none" | "scroll";
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3",
        inset === "scroll" && "-mr-1 pr-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FeatureListItemButton({
  active,
  children,
  className,
  density = "default",
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  density?: "comfortable" | "default";
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cx(
        "w-full rounded-lg border border-line bg-panel text-left transition-all hover:border-accent/40 hover:bg-app-elevated",
        density === "comfortable" ? "p-3.5" : "p-3",
        active && "border-accent bg-accent-soft",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function FeatureSettingsPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-5 content-start", className)}>{children}</div>
  );
}

export function FeaturePreviewPanel({
  children,
  className,
  frameClassName,
  title = "Previa",
}: {
  children: ReactNode;
  className?: string;
  frameClassName?: string;
  title?: ReactNode;
}) {
  return (
    <FeatureCard className={cx("min-h-[36rem] p-5", className)} padding="none">
      <FeatureCardHeader className="mb-4">
        <FeatureCardTitle>{title}</FeatureCardTitle>
      </FeatureCardHeader>
      <div
        className={cx(
          "max-h-[72rem] overflow-auto rounded-lg border border-line bg-app",
          frameClassName,
        )}
      >
        {children}
      </div>
    </FeatureCard>
  );
}

function statToneSurfaceClass(tone: FeatureCardTone) {
  if (tone === "accent") {
    return "border-accent/20 bg-accent-soft";
  }
  if (tone === "blue") {
    return "border-blue-start/20 bg-blue-soft";
  }
  if (tone === "danger") {
    return "border-danger/20 bg-danger/10";
  }
  if (tone === "green") {
    return "border-emerald-500/20 bg-emerald-500/10";
  }
  if (tone === "violet") {
    return "border-violet-500/20 bg-violet-500/10";
  }
  if (tone === "warning") {
    return "border-warning/30 bg-warning/10";
  }
  return "border-line bg-app-elevated";
}

function statToneTintedSurfaceClass(tone: FeatureCardTone) {
  if (tone === "accent") return "feature-stat-card--accent";
  if (tone === "blue") return "feature-stat-card--blue";
  if (tone === "danger") return "feature-stat-card--danger";
  if (tone === "green") return "feature-stat-card--green";
  if (tone === "violet") return "feature-stat-card--violet";
  if (tone === "warning") return "feature-stat-card--warning";
  return "feature-stat-card--neutral";
}

function statToneIconClass(tone: FeatureCardTone) {
  if (tone === "accent") return "text-accent-strong";
  if (tone === "blue") return "text-blue-start";
  if (tone === "danger") return "text-danger";
  if (tone === "green") return "text-emerald-500";
  if (tone === "violet") return "text-violet-start";
  if (tone === "warning") return "text-warning-strong";
  return "text-muted";
}
