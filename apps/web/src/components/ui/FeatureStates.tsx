import type { ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

export type FeatureStatusTone =
  "blue" | "danger" | "neutral" | "pink" | "success" | "warning";

export function FeatureEmptyState({
  action,
  body,
  className,
  icon: IconComponent,
  title,
}: {
  action?: ReactNode;
  body: ReactNode;
  className?: string;
  icon: FeatureIcon;
  title: ReactNode;
}) {
  return (
    <div
      className={cx(
        "glass-panel-branded p-12 text-center flex flex-col items-center justify-center",
        className,
      )}
    >
      <IconComponent aria-hidden="true" className="mb-4 size-14 text-muted" />
      <h3 className="text-xl font-black text-app-text">{title}</h3>
      <p className="mt-2 text-sm font-bold text-muted max-w-md w-full">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function FeatureAlert({
  action,
  children,
  className = "feature-alert",
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <section className={className} role="alert">
      {icon}
      {title ? <strong>{title}</strong> : null}
      {children}
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export function FeatureLoadingState({
  children,
  className = "feature-empty",
  icon: IconComponent,
  title,
}: {
  children?: ReactNode;
  className?: string;
  icon?: FeatureIcon;
  title?: ReactNode;
}) {
  return (
    <section className={className}>
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
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: FeatureStatusTone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider",
        statusToneClass(tone),
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function statusToneClass(tone: FeatureStatusTone) {
  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  }
  if (tone === "warning") {
    return "bg-warning/10 text-warning border border-warning/20";
  }
  if (tone === "danger" || tone === "pink") {
    return "bg-pink-500/10 text-pink-500 border border-pink-500/20";
  }
  if (tone === "blue") {
    return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
  }
  return "bg-panel text-muted border border-line";
}
