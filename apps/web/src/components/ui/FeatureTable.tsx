import type { ReactNode } from "react";
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
  return (
    <div className={cx("flex h-10 items-center justify-end gap-2", className)}>
      {children}
    </div>
  );
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
  onClick: () => void;
  tooltip: ReactNode;
}) {
  return (
    <div className="relative flex items-center">
      <button
        aria-label={ariaLabel}
        className="peer flex cursor-pointer items-center justify-center rounded-lg border border-line bg-panel p-1.5 text-muted shadow-sm transition-all hover:bg-accent-soft hover:text-accent-strong hover:border-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <IconComponent
          aria-hidden="true"
          className={cx("size-3.5", iconClassName)}
        />
      </button>
      <div className="absolute right-full top-1/2 z-30 mr-2 hidden -translate-y-1/2 whitespace-nowrap rounded border border-white/10 bg-gray-900 px-2 py-1 text-xs font-bold leading-none text-white shadow-lg pointer-events-none peer-hover:block">
        {tooltip}
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-l-gray-900" />
      </div>
    </div>
  );
}
