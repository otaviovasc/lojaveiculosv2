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
  if (variant === "content" || variant === "plain") {
    return <main className={cx("content-frame", className)}>{children}</main>;
  }

  return (
    <div
      className={cx(
        "relative min-h-screen store-dashboard overflow-hidden",
        className,
      )}
    >
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
  className,
  description,
  eyebrow,
  hiddenStateValue,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  actionsLabel?: string;
  chip?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow: ReactNode;
  hiddenStateValue?: string;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cx("documents-top-bar", className)}>
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
          <div className="max-w-3xl text-sm font-bold text-muted">
            {description}
          </div>
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
      aria-busy={isBusy || undefined}
      aria-disabled={disabled || isBusy || undefined}
      aria-label={label}
      className={cx(
        "documents-top-bar-action",
        variant === "primary" && "documents-top-bar-action--primary",
        className,
      )}
      disabled={disabled || isBusy}
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
  radius = "default",
}: {
  children: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  radius?: "default" | "xl";
}) {
  const toolbarClassName = cx(
    "glass-panel-branded p-5 !overflow-visible",
    radius === "xl" && "feature-toolbar--radius-xl",
    className,
  );
  const content = (
    <>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {children}
    </>
  );

  if (onSubmit) {
    return (
      <form className={toolbarClassName} onSubmit={onSubmit}>
        {content}
      </form>
    );
  }

  return <section className={toolbarClassName}>{content}</section>;
}

export function FeatureSection({
  actions,
  children,
  className,
  description,
  headerClassName,
  icon,
  padding = "default",
  radius = "default",
  title,
  titleClassName,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  headerClassName?: string;
  icon?: ReactNode;
  padding?: "comfortable" | "compact" | "default" | "none";
  radius?: "default" | "xl";
  title?: ReactNode;
  titleClassName?: string;
}) {
  const hasHeader = Boolean(title || description || actions || icon);
  return (
    <section
      className={cx(
        "panel",
        padding === "comfortable" && "p-6 md:p-8",
        padding === "compact" && "p-5",
        padding === "default" && "p-5",
        padding === "none" && "!p-0",
        radius === "xl" && "panel--radius-xl",
        className,
      )}
    >
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
                    "text-base font-bold text-app-text",
                    titleClassName,
                  )}
                >
                  {title}
                </h3>
              ) : null}
            </div>
            {description ? (
              <p className="mt-1 text-sm font-medium text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
