import type { ReactNode } from "react";

export function BillingSummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="billing-summary-card">
      <div className="billing-summary-card-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="billing-summary-card-info">
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
