import type { ReactNode } from "react";
import { cx } from "../../components/ui/featureShared";

export function CommissionIconAction({
  disabled,
  icon,
  label,
  onClick,
  variant = "default",
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "edit" | "delete";
}) {
  return (
    <button
      aria-label={label}
      className={cx(
        "commission-icon-action flex size-11 items-center justify-center rounded-lg border border-line bg-app transition-colors disabled:text-muted disabled:opacity-60",
        variant === "edit" && "text-blue-start hover:text-blue-start/80",
        variant === "delete" && "text-danger hover:text-danger/80",
        variant === "default" && "text-accent-strong",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}
