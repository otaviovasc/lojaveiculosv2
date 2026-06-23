import { CalendarDays, Check, CheckCircle2, Copy, Eye } from "lucide-react";
import { motion } from "motion/react";
import { getDashboardEntryMotion } from "../features/analytics/dashboardHomeAnimation";
import type { AnalyticsDashboard } from "../features/analytics/types";

export function DashboardHomeToolbar({
  copyState,
  dashboard,
  onCopyLink,
  onVisitStore,
}: {
  copyState: "idle" | "copied";
  dashboard: AnalyticsDashboard | null;
  onCopyLink: () => void;
  onVisitStore: () => void;
}) {
  const publicUrl = `${dashboard?.storeId || "test-store"}.lojaveiculos.com.br`;

  return (
    <div className="dashboard-toolbar">
      <motion.div
        {...getDashboardEntryMotion(0.05)}
        className="glass-panel-branded dashboard-control-tile"
      >
        <div className="dashboard-tile-header">
          <div className="dashboard-icon-badge dashboard-icon-badge-success">
            <CheckCircle2 className="size-5.5 shrink-0" />
          </div>
          <div>
            <span className="dashboard-tile-label">Status da Loja</span>
            <div className="dashboard-status-indicator">
              <span className="dashboard-pulse-dot">
                <span className="ping"></span>
                <span className="dot"></span>
              </span>
              <span className="dashboard-status-text">Loja Ativa</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        {...getDashboardEntryMotion(0.1)}
        className="glass-panel-branded dashboard-control-tile"
      >
        <div className="dashboard-tile-header">
          <div className="dashboard-icon-badge dashboard-icon-badge-info">
            <CalendarDays className="size-5.5 shrink-0" />
          </div>
          <div>
            <span className="dashboard-tile-label">Período</span>
            <span className="dashboard-tile-value">Últimos 30 Dias</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        {...getDashboardEntryMotion(0.15)}
        className="glass-panel-branded dashboard-control-tile"
      >
        <div className="min-w-0 pr-3">
          <span className="dashboard-tile-label">Link Público</span>
          <span
            className="text-xs font-bold text-primary truncate block hover:text-accent transition-colors cursor-pointer"
            onClick={onVisitStore}
          >
            {publicUrl}
          </span>
        </div>
        <div className="dashboard-tile-actions">
          <button
            onClick={onCopyLink}
            className={
              "dashboard-tile-btn " +
              (copyState === "copied"
                ? "dashboard-tile-btn-copied"
                : "dashboard-tile-btn-default")
            }
            title="Copiar Link"
          >
            {copyState === "copied" ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
          <button
            onClick={onVisitStore}
            className="dashboard-tile-btn dashboard-tile-btn-default"
            title="Visitar Loja"
          >
            <Eye className="size-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
