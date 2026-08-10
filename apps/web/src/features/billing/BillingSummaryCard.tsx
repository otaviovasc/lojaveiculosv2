import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function BillingSummaryCard({
  className,
  decorativeIcon = false,
  icon,
  label,
  showIcon = true,
  value,
}: {
  className?: string;
  decorativeIcon?: boolean;
  icon: ReactNode;
  label: string;
  showIcon?: boolean;
  value: string;
}) {
  return (
    <article className={cn("billing-summary-card", className)}>
      {decorativeIcon ? (
        <div
          className="billing-summary-card-decorative-icon"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      {showIcon ? (
        <div className="billing-summary-card-icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="billing-summary-card-info">
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
