import type { ReactNode } from "react";
import { formatCurrency } from "./financeBillsFormat";

export function CommissionIconAction({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="rounded-lg border border-line bg-app p-2 text-accent-strong disabled:text-muted disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

export function SellerMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-28 rounded-lg border border-line bg-app px-3 py-2">
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="text-sm font-black text-app-text">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
