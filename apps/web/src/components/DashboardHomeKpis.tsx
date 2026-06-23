import { Banknote, Bot, Target, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { getDashboardEntryMotion } from "../features/analytics/dashboardHomeAnimation";
import type { createDashboardStats } from "../features/analytics/dashboardModel";

type DashboardStat = ReturnType<typeof createDashboardStats>[number];

export function DashboardHomeKpis({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="kpi-counters-grid">
      {stats.map((stat, idx) => {
        const KpiIcon = getKpiIcon(stat.label);
        return (
          <motion.div
            key={stat.label}
            {...getDashboardEntryMotion(0.2 + idx * 0.05)}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`kpi-card-premium ${getKpiToneClass(stat.tone)} group cursor-pointer`}
          >
            <div className="kpi-card-glow-container">
              <div className="kpi-card-blob-1 animate-blob-1" />
              <div className="kpi-card-blob-2 animate-blob-2" />
            </div>
            <div className="gloss-overlay" />
            <div className="kpi-card-content">
              <div className="kpi-card-header">
                <div className="kpi-icon-container">
                  <KpiIcon className="size-5.5 text-white" />
                </div>
                <span className="kpi-card-badge">{stat.deltaLabel}</span>
              </div>
              <div className="kpi-card-body">
                <p className="kpi-card-label">{stat.label}</p>
                <h3 className="kpi-card-value">{stat.value}</h3>
              </div>
            </div>
            <KpiIcon className="kpi-bg-icon text-white" />
          </motion.div>
        );
      })}
    </div>
  );
}

function getKpiToneClass(tone: string) {
  switch (tone) {
    case "green":
      return "kpi-gradient-green";
    case "blue":
      return "kpi-gradient-blue";
    case "violet":
      return "kpi-gradient-violet";
    case "pink":
    default:
      return "kpi-gradient-pink";
  }
}

function getKpiIcon(label: string) {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("faturamento")) return Banknote;
  if (lowerLabel.includes("medio") || lowerLabel.includes("médio")) {
    return Target;
  }
  if (lowerLabel.includes("conversao") || lowerLabel.includes("conversão")) {
    return TrendingUp;
  }
  return Bot;
}
