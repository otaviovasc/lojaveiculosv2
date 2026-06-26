import type { FormEvent, ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

export function FeaturePageShell({
  children,
  className,
  mainClassName,
  variant = "dashboard",
}: {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  variant?: "content" | "dashboard" | "plain";
}) {
  if (variant === "content") {
    return <main className={cx("content-frame", className)}>{children}</main>;
  }

  if (variant === "plain") {
    return (
      <main
        className={cx(
          "mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6",
          className,
        )}
      >
        {children}
      </main>
    );
  }

  return (
    <div
      className={cx(
        "relative min-h-screen store-dashboard overflow-hidden",
        className,
      )}
    >
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <main className={cx("dashboard-main relative z-10", mainClassName)}>
        {children}
      </main>
    </div>
  );
}

export function FeaturePageHeader({
  actions,
  actionsLabel = "Ações da página",
  chip,
  description,
  eyebrow,
  hiddenStateValue,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  actionsLabel?: string;
  chip?: ReactNode;
  description?: ReactNode;
  eyebrow: ReactNode;
  hiddenStateValue?: string;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="documents-top-bar">
      <div className="documents-top-bar-titles">
        <div className="documents-top-bar-eyebrow">
          {eyebrow}
          {subtitle ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{subtitle}</span>
            </>
          ) : null}
        </div>
        <h1 className="documents-top-bar-title">{title}</h1>
        {description ? (
          <p className="max-w-3xl text-sm font-bold text-muted">
            {description}
          </p>
        ) : null}
        {chip ? <span className="documents-top-bar-chip">{chip}</span> : null}
      </div>

      {actions ? (
        <div
          aria-label={actionsLabel}
          className="documents-top-bar-actions"
          role="toolbar"
        >
          {actions}
        </div>
      ) : null}

      {hiddenStateValue ? (
        <input
          aria-hidden="true"
          className="documents-top-bar-sr-only"
          readOnly
          tabIndex={-1}
          type="hidden"
          value={hiddenStateValue}
        />
      ) : null}
    </div>
  );
}

export function FeatureActionButton({
  children,
  className,
  disabled,
  icon: IconComponent,
  isBusy = false,
  label,
  onClick,
  title,
  type = "button",
  variant = "secondary",
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: FeatureIcon;
  isBusy?: boolean;
  label: string;
  onClick?: () => void;
  title?: string;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={cx(
        "documents-top-bar-action",
        variant === "primary" && "documents-top-bar-action--primary",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {IconComponent ? (
        <IconComponent
          aria-hidden="true"
          className={cx("size-4", isBusy && "animate-spin")}
        />
      ) : null}
      <span>{children ?? label}</span>
    </button>
  );
}

export function FeatureToolbar({
  children,
  className,
  eyebrow,
  onSubmit,
}: {
  children: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const content = (
    <>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {children}
    </>
  );

  if (onSubmit) {
    return (
      <form
        className={cx("glass-panel-branded p-5 !overflow-visible", className)}
        onSubmit={onSubmit}
      >
        {content}
      </form>
    );
  }

  return (
    <section
      className={cx("glass-panel-branded p-5 !overflow-visible", className)}
    >
      {content}
    </section>
  );
}

export function FeatureSection({
  actions,
  children,
  className,
  description,
  headerClassName,
  icon,
  title,
  titleClassName,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  headerClassName?: string;
  icon?: ReactNode;
  title?: ReactNode;
  titleClassName?: string;
}) {
  const hasHeader = Boolean(title || description || actions || icon);

  return (
    <section className={cx("panel", className)}>
      {hasHeader ? (
        <div
          className={cx(
            "flex items-start justify-between gap-3",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-accent-strong">
              {icon}
              {title ? (
                <h3
                  className={cx(
                    "text-base font-black text-app-text",
                    titleClassName,
                  )}
                >
                  {title}
                </h3>
              ) : null}
            </div>
            {description ? (
              <p className="mt-1 text-sm font-bold text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
