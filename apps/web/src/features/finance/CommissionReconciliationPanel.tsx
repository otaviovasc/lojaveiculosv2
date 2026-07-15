import {
  AlertTriangle,
  Car,
  CircleOff,
  Link2Off,
  UserRoundX,
} from "lucide-react";
import type { CommissionReconciliationIssue } from "./types";

const issueCopy = {
  cancelled_sale: {
    icon: CircleOff,
    label: "Venda cancelada com comissão ativa",
  },
  missing_commission: {
    icon: AlertTriangle,
    label: "Venda fechada sem comissão",
  },
  missing_sale: { icon: Link2Off, label: "Comissão sem venda válida" },
  missing_vehicle: { icon: Car, label: "Comissão sem veículo identificado" },
  reverted_sale: {
    icon: CircleOff,
    label: "Venda revertida com comissão ativa",
  },
  seller_mismatch: {
    icon: UserRoundX,
    label: "Comissão padrão diverge do vendedor da venda",
  },
} as const;

export function CommissionReconciliationPanel({
  issues,
}: {
  issues: readonly CommissionReconciliationIssue[];
}) {
  if (!issues.length) return null;
  const groups = Object.entries(issueCopy)
    .map(([code, copy]) => ({
      ...copy,
      code: code as CommissionReconciliationIssue["code"],
      count: issues.filter((issue) => issue.code === code).length,
    }))
    .filter((group) => group.count > 0);
  return (
    <section className="rounded-lg border border-warning/45 bg-warning/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-warning-strong"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-app-text">
            Conciliação necessária
          </h2>
          <p className="mt-1 text-xs font-bold text-muted">
            {issues.length} inconsistência(s) impedem uma conferência totalmente
            automática deste período.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map(({ code, count, icon: Icon, label }) => (
              <div
                className="flex items-center gap-2 rounded-lg border border-warning/35 bg-panel/70 px-3 py-2"
                key={code}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-warning-strong"
                />
                <span className="min-w-0 flex-1 text-xs font-bold text-app-text">
                  {label}
                </span>
                <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-black text-app-text">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
