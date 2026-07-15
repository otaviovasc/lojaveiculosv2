import type { ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

export type FeatureStatusTone =
  "blue" | "danger" | "neutral" | "pink" | "success" | "warning";

export function FeatureEmptyState({
  action,
  body,
  className,
  density = "default",
  icon: IconComponent,
  title,
}: {
  action?: ReactNode;
  body: ReactNode;
  className?: string;
  density?: "compact" | "default";
  icon: FeatureIcon;
  title: ReactNode;
}) {
  return (
    <div
      className={cx(
        "glass-panel-branded p-12 text-center flex flex-col items-center justify-center",
        density === "compact" && "!p-6",
        className,
      )}
    >
      <IconComponent aria-hidden="true" className="mb-4 size-14 text-muted" />
      <h3 className="text-xl font-bold text-app-text">{title}</h3>
      <div className="mt-2 flex w-full justify-center">
        <p className="w-full max-w-md text-sm font-medium text-muted">{body}</p>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function FeatureAlert({
  action,
  children,
  className,
  icon,
  title,
  tone = "danger",
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: ReactNode;
  tone?: "danger" | "info" | "success" | "warning";
}) {
  return (
    <section
      aria-live={tone === "danger" ? "assertive" : "polite"}
      className={cx(
        "feature-alert flex items-start gap-3",
        `feature-alert--${tone}`,
        className,
      )}
      data-tone={tone}
      role={tone === "danger" ? "alert" : "status"}
    >
      {icon ? (
        <span className="feature-alert__icon mt-0.5 shrink-0">{icon}</span>
      ) : null}
      <div className="feature-alert__content min-w-0 flex-1">
        {title ? (
          <strong className="feature-alert__title block">{title}</strong>
        ) : null}
        <div className={cx(title ? "mt-1" : undefined)}>{children}</div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </section>
  );
}

export function FeatureLoadingState({
  children,
  className = "feature-empty",
  density = "default",
  icon: IconComponent,
  title,
}: {
  children?: ReactNode;
  className?: string;
  density?: "compact" | "default";
  icon?: FeatureIcon;
  title?: ReactNode;
}) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={cx(density === "compact" && "p-6", className)}
      role="status"
    >
      {IconComponent ? (
        <IconComponent aria-hidden="true" className="size-5" />
      ) : null}
      {title ? <strong>{title}</strong> : null}
      {children}
    </section>
  );
}

export function FeatureStatusBadge({
  children,
  className,
  size = "default",
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  size?: "compact" | "default" | "dense";
  tone?: FeatureStatusTone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold uppercase tracking-wider",
        size === "default" && "px-2.5 py-1",
        size === "compact" && "px-2 py-1",
        size === "dense" && "px-2 py-0.5",
        statusToneClass(tone),
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx("size-1.5 rounded-full", statusDotToneClass(tone))}
      />
      {children}
    </span>
  );
}

function statusToneClass(tone: FeatureStatusTone) {
  if (tone === "success") {
    return "border border-success-strong/30 bg-green-soft text-app-text";
  }
  if (tone === "warning") {
    return "border border-warning-strong/30 bg-warning/10 text-app-text";
  }
  if (tone === "danger" || tone === "pink") {
    return "border border-danger/30 bg-accent-soft text-app-text";
  }
  if (tone === "blue") {
    return "border border-blue-start/30 bg-blue-soft text-app-text";
  }
  return "bg-panel text-muted border border-line";
}

function statusDotToneClass(tone: FeatureStatusTone) {
  if (tone === "success") return "bg-success-strong";
  if (tone === "warning") return "bg-warning-strong";
  if (tone === "danger" || tone === "pink") return "bg-danger";
  if (tone === "blue") return "bg-blue-start";
  return "bg-muted";
}
