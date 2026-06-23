import { Car, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

export function InventoryListHeader({
  available,
  reserved,
  sold,
  total,
}: {
  available: number;
  reserved: number;
  sold: number;
  total: number;
}) {
  const stats = [
    {
      label: "Total em Estoque",
      value: total,
      tone: "violet",
      icon: Car,
    },
    {
      label: "Disponíveis",
      value: available,
      tone: "green",
      icon: CheckCircle2,
    },
    {
      label: "Reservados",
      value: reserved,
      tone: "pink",
      icon: Clock,
    },
    {
      label: "Vendidos",
      value: sold,
      tone: "blue",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, idx) => {
        const KpiIcon = stat.icon;
        const toneClass =
          stat.tone === "green"
            ? "kpi-gradient-green"
            : stat.tone === "blue"
              ? "kpi-gradient-blue"
              : stat.tone === "violet"
                ? "kpi-gradient-violet"
                : "kpi-gradient-pink";
        const className = [
          "kpi-card-premium flex items-center gap-3 !p-3 !px-4 !rounded-xl",
          toneClass,
          "border border-white/10 shadow-sm text-white cursor-default",
        ].join(" ");

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            whileHover={{ y: -2, scale: 1.015 }}
            className={className}
          >
            {/* Shine highlight */}
            <div className="gloss-overlay" />

            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 border border-white/10 relative z-10">
              <KpiIcon className="size-4.5 text-white" />
            </div>
            <div className="min-w-0 relative z-10">
              <span className="block text-[9px] font-black uppercase tracking-wider text-white/70 leading-none">
                {stat.label}
              </span>
              <strong className="block text-lg font-black text-white mt-1.5 leading-none">
                {stat.value}
              </strong>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
