import type { ReactNode } from "react";
import { cx } from "./featureShared";
import type { StatusPageTone } from "./statusPageTypes";
import { useStatusPageMotion } from "./useStatusPageMotion";

export type { StatusPageTone } from "./statusPageTypes";

/**
 * Full-page status surface (404, crash, restricted, storefront states).
 * Keeps the LV watermark, a themed illustration scene, semantic tone color,
 * and an accessible live region. `screen` owns the viewport; `fill` centers
 * inside an existing shell/panel.
 */
export function StatusPage({
  body,
  children,
  className,
  code,
  illustration,
  layout = "screen",
  meta,
  primaryAction,
  role = "status",
  secondaryAction,
  title,
  tone = "accent",
}: {
  body: ReactNode;
  children?: ReactNode;
  className?: string;
  code?: string;
  illustration?: ReactNode;
  layout?: "fill" | "screen";
  meta?: ReactNode;
  primaryAction?: ReactNode;
  role?: "alert" | "status";
  secondaryAction?: ReactNode;
  title: ReactNode;
  tone?: StatusPageTone;
}) {
  const rootRef = useStatusPageMotion<HTMLElement>();

  return (
    <section
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={cx(
        "status-page",
        layout === "fill" && "status-page--fill",
        className,
      )}
      data-tone={tone}
      ref={rootRef}
      role={role}
    >
      <span aria-hidden="true" className="feature-empty-state__watermark" />
      <div className="status-page__inner">
        {illustration ? (
          <div className="status-page__scene" data-status-motion>
            {illustration}
          </div>
        ) : null}
        {code ? (
          <p className="status-page__code" data-status-motion>
            {code}
          </p>
        ) : null}
        <h1 className="status-page__title" data-status-motion>
          {title}
        </h1>
        <div className="status-page__body" data-status-motion>
          {body}
        </div>
        {primaryAction || secondaryAction ? (
          <div className="status-page__actions" data-status-motion>
            {primaryAction}
            {secondaryAction}
          </div>
        ) : null}
        {meta ? (
          <p className="status-page__meta" data-status-motion>
            {meta}
          </p>
        ) : null}
        {children ? <div className="status-page__extra">{children}</div> : null}
      </div>
    </section>
  );
}
