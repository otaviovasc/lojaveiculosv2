import { useEffect, useRef, type ReactNode } from "react";
import { animate } from "animejs";
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
  tone = "accent",
}: {
  action?: ReactNode;
  body: ReactNode;
  className?: string;
  density?: "compact" | "default";
  icon: FeatureIcon;
  title: ReactNode;
  tone?: "accent" | "blue" | "green" | "neutral" | "warning";
}) {
  return (
    <div
      className={cx(
        "feature-empty-state glass-panel-branded flex flex-col items-center justify-center p-12 text-center",
        density === "compact" && "!p-6",
        className,
      )}
    >
      <span aria-hidden="true" className="feature-empty-state__watermark" />
      <span
        className={cx(
          "feature-empty-state__chip",
          tone !== "accent" && `feature-empty-state__chip--${tone}`,
        )}
      >
        <IconComponent aria-hidden="true" className="size-7" />
      </span>
      <h3 className="feature-empty-state__title mt-5">{title}</h3>
      <div className="mt-2 flex w-full justify-center">
        <p className="w-full max-w-md text-sm font-medium text-muted">{body}</p>
      </div>
      {action ? <div className="mt-6">{action}</div> : null}
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

/**
 * Branded loading surface. The default density renders the premium panel
 * (watermark, progress-ring chip, indeterminate track) used by the module
 * Suspense fallback; a caller-provided `className` or `density="compact"`
 * keeps the small inline variant for nested panels. Entry motion is a short
 * Anime.js fade/slide, skipped under reduced motion.
 */
export function FeatureLoadingState({
  children,
  className,
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
  const rootRef = useFeatureLoadingMotion<HTMLElement>();
  const inline = density === "compact" || className !== undefined;

  if (inline) {
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        className={cx(
          "feature-loading-inline",
          density === "compact" && "p-6",
          className ?? "feature-empty",
        )}
        ref={rootRef}
        role="status"
      >
        {IconComponent ? (
          <IconComponent aria-hidden="true" className="size-5 animate-spin" />
        ) : (
          <span aria-hidden="true" className="feature-loading-inline__ring" />
        )}
        {title ? <strong>{title}</strong> : null}
        {children}
      </section>
    );
  }

  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="feature-loading-state glass-panel-branded"
      ref={rootRef}
      role="status"
    >
      <span aria-hidden="true" className="feature-empty-state__watermark" />
      <span className="feature-loading-state__chip" data-loading-motion>
        {IconComponent ? (
          <IconComponent aria-hidden="true" className="size-7" />
        ) : (
          <span aria-hidden="true" className="feature-loading-state__ring" />
        )}
      </span>
      {title ? (
        <strong className="feature-loading-state__title" data-loading-motion>
          {title}
        </strong>
      ) : null}
      {children ? (
        <div className="feature-loading-state__body" data-loading-motion>
          {children}
        </div>
      ) : null}
      <span
        aria-hidden="true"
        className="feature-loading-state__track"
        data-loading-motion
      />
    </section>
  );
}

function useFeatureLoadingMotion<T extends HTMLElement>() {
  const rootRef = useRef<T>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = animate(root, {
      duration: 240,
      ease: "out(4)",
      opacity: { from: 0 },
      y: { from: 8 },
    });
    return () => {
      animation.revert();
    };
  }, []);

  return rootRef;
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
    return "border border-success-strong/30 bg-green-soft text-success-strong";
  }
  if (tone === "warning") {
    return "border border-warning-strong/30 bg-warning/10 text-warning-strong";
  }
  if (tone === "danger" || tone === "pink") {
    return "border border-danger/30 bg-danger/10 text-danger";
  }
  if (tone === "blue") {
    return "border border-blue-start/30 bg-blue-soft text-info-soft-foreground";
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
