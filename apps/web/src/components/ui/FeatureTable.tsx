import type { MouseEvent, ReactNode } from "react";
import { cx, type FeatureIcon } from "./featureShared";

export function FeatureTableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "overflow-x-auto rounded-2xl border border-line bg-panel/40 backdrop-blur-md shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FeatureRowActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx("feature-row-actions", className)}>{children}</div>;
}

export function FeatureRowAction({
  ariaLabel,
  disabled,
  icon: IconComponent,
  iconClassName,
  onClick,
  tooltip,
}: {
  ariaLabel: string;
  disabled?: boolean;
  icon: FeatureIcon;
  iconClassName?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  tooltip: ReactNode;
}) {
  return (
    <div className="feature-row-action">
      <button
        aria-label={ariaLabel}
        className="feature-row-action__button"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <IconComponent
          aria-hidden="true"
          className={cx("feature-row-action__icon", iconClassName)}
        />
      </button>
      <div className="feature-row-action__tooltip" role="tooltip">
        {tooltip}
      </div>
    </div>
  );
}
