import type { ReactNode } from "react";
import { cx } from "./featureShared";

export function FeatureField({
  as: Element = "label",
  children,
  className,
  error,
  hint,
  label,
}: {
  // Use "div" for composite controls (segmented controls, tab strips):
  // a <label> wrapper swallows the accessible name of the buttons inside.
  as?: "div" | "label";
  children: ReactNode;
  className?: string | undefined;
  error?: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
}) {
  return (
    <Element
      className={cx(
        "grid gap-2 text-sm font-semibold text-app-text/90",
        className,
      )}
    >
      <span>{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-semibold text-danger" role="alert">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span className="text-xs font-medium text-muted">{hint}</span>
      ) : null}
    </Element>
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
          <h4 className="text-xs font-semibold uppercase tracking-wider text-accent">
            {title}
          </h4>
          {description ? (
            <p className="mt-1 text-xs font-medium text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
