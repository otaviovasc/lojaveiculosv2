import type { ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

type FeatureCardTone =
  "accent" | "blue" | "danger" | "green" | "neutral" | "violet";

export function FeatureCard({
  children,
  className,
  padding = "none",
}: {
  children: ReactNode;
  className?: string;
  padding?: "compact" | "none";
}) {
  return (
    <section
      className={cx(
        "rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]",
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
    <h3 className={cx("text-base font-black text-app-text", className)}>
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
    <p className={cx("text-sm font-bold text-muted", className)}>{children}</p>
  );
}

export function FeatureStatCard({
  className,
  icon: IconComponent,
  label,
  tone = "neutral",
  value,
}: {
  className?: string;
  icon?: FeatureIcon;
  label: ReactNode;
  tone?: FeatureCardTone;
  value: ReactNode;
}) {
  return (
    <FeatureCard
      className={cx(
        "flex items-center justify-between gap-4 p-4 transition-all hover:border-line-strong",
        className,
      )}
    >
      <div className="min-w-0">
        <span className="block text-xs font-black uppercase tracking-wider text-muted">
          {label}
        </span>
        <strong className="mt-1 block text-2xl font-black text-app-text tabular-nums">
          {value}
        </strong>
      </div>
      {IconComponent ? (
        <div
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-lg border",
            statToneClass(tone),
          )}
        >
          <IconComponent aria-hidden="true" className="size-5" />
        </div>
      ) : null}
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
    <FeatureCard className={cx("min-h-[36rem] p-5", className)}>
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

function statToneClass(tone: FeatureCardTone) {
  if (tone === "accent") {
    return "border-accent/20 bg-accent-soft text-accent-strong";
  }
  if (tone === "blue") {
    return "border-blue-start/20 bg-blue-soft text-blue-start";
  }
  if (tone === "danger") {
    return "border-danger/20 bg-danger/10 text-danger";
  }
  if (tone === "green") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  }
  if (tone === "violet") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-start";
  }
  return "border-line bg-app-elevated text-muted";
}
