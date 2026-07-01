import type { ReactNode } from "react";
import { cx } from "./featureShared";

export function FeatureField({
  children,
  className,
  error,
  hint,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
}) {
  return (
    <label
      className={cx("grid gap-2 text-sm font-black text-app-text", className)}
    >
      <span>{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-black text-danger" role="alert">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span className="text-xs font-bold text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function FeatureFieldGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-3 md:grid-cols-2", className)}>{children}</div>
  );
}

export function FeatureFormSection({
  actions,
  children,
  className,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section
      className={cx("grid gap-4 border-b border-line/40 pb-6", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-accent">
            {title}
          </h4>
          {description ? (
            <p className="mt-1 text-xs font-bold text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
