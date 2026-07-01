import { CalendarDays, Check, CheckCircle2, Copy, Eye } from "lucide-react";
import { DashboardHomeEntry } from "./DashboardHomeEntry";

export function DashboardHomeToolbar({
  copyState,
  onCopyLink,
  onVisitStore,
  publicSlug,
}: {
  copyState: "idle" | "copied";
  onCopyLink: () => void;
  onVisitStore: () => void;
  publicSlug?: string | undefined;
}) {
  const publicUrl = publicSlug
    ? `${publicSlug}.lojaveiculos.com.br`
    : "Loja sem link público";

  return (
    <div className="dashboard-toolbar">
      <DashboardHomeEntry delay={0.02}>
        <div className="glass-panel-branded dashboard-control-tile">
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
        </div>
      </DashboardHomeEntry>

      <DashboardHomeEntry delay={0.04}>
        <div className="glass-panel-branded dashboard-control-tile">
          <div className="dashboard-tile-header">
            <div className="dashboard-icon-badge dashboard-icon-badge-info">
              <CalendarDays className="size-5.5 shrink-0" />
            </div>
            <div>
              <span className="dashboard-tile-label">Período</span>
              <span className="dashboard-tile-value">Últimos 30 Dias</span>
            </div>
          </div>
        </div>
      </DashboardHomeEntry>

      <DashboardHomeEntry delay={0.06}>
        <div className="glass-panel-branded dashboard-control-tile">
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
              disabled={!publicSlug}
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
              disabled={!publicSlug}
              title="Visitar Loja"
            >
              <Eye className="size-4" />
            </button>
          </div>
        </div>
      </DashboardHomeEntry>
    </div>
  );
}
