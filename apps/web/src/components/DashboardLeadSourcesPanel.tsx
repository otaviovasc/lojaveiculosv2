import { Target } from "lucide-react";
import type { AnalyticsDashboard } from "../features/analytics/types";
import { DashboardHomeEntry } from "./DashboardHomeEntry";

export function DashboardLeadSourcesPanel({
  dashboard,
}: {
  dashboard: AnalyticsDashboard | null;
}) {
  return (
    <DashboardHomeEntry className="h-full" delay={0.16}>
      <div className="glass-panel-branded dashboard-card">
        <div className="card-header card-header-gradient">
          <div className="card-header-title-container">
            <div className="card-header-icon card-header-icon-violet">
              <Target className="size-5" />
            </div>
            <h3 className="card-header-title">Canais de Lead</h3>
          </div>
        </div>
        <div className="card-body card-body-centered">
          {dashboard?.leadSources && dashboard.leadSources.length > 0 ? (
            dashboard.leadSources.slice(0, 3).map((source, idx) => {
              const totalCount =
                dashboard.leadSources.reduce(
                  (acc, curr) => acc + curr.value,
                  0,
                ) || 1;
              const percent = Math.round((source.value / totalCount) * 100);
              const tone = leadSourceTone(idx);

              return (
                <div key={source.key} className="lead-source-row">
                  <div className="lead-source-label-row">
                    <div className="lead-source-info">
                      <span className={tone.dotClass} />
                      <span className="lead-source-name">{source.label}</span>
                    </div>
                    <span className={tone.valueClass}>
                      {source.value}
                      <span className="lead-source-percentage">
                        ({percent}%)
                      </span>
                    </span>
                  </div>
                  <div className="lead-source-progress-container">
                    <div
                      className={`progress-bar ${tone.progressClass}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <p className="text-xs font-bold text-muted">
                Aguardando captação de leads.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardHomeEntry>
  );
}

function leadSourceTone(index: number) {
  if (index === 1) {
    return {
      dotClass: "lead-source-dot bg-blue-500",
      progressClass: "neon-progress-blue",
      valueClass: "lead-source-value lead-source-value-blue",
    };
  }
  if (index >= 2) {
    return {
      dotClass: "lead-source-dot bg-violet-500",
      progressClass: "neon-progress-violet",
      valueClass: "lead-source-value lead-source-value-violet",
    };
  }
  return {
    dotClass: "lead-source-dot bg-emerald-500",
    progressClass: "neon-progress-green",
    valueClass: "lead-source-value lead-source-value-green",
  };
}
