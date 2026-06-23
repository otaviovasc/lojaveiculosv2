import { Car, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "../../../components/ui/CountUp";
import AnimatedContent from "../../../components/ui/AnimatedContent";
import type { InventoryListStatusFilter } from "../model/listCatalogModel";

export function InventoryListHeader({
  activeStatus,
  available,
  onStatusSelect,
  reserved,
  sold,
  total,
}: {
  activeStatus: InventoryListStatusFilter;
  available: number;
  onStatusSelect: (status: InventoryListStatusFilter) => void;
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
      status: "",
    },
    {
      label: "Disponíveis",
      value: available,
      tone: "green",
      icon: CheckCircle2,
      status: "available",
    },
    {
      label: "Reservados",
      value: reserved,
      tone: "pink",
      icon: Clock,
      status: "reserved",
    },
    {
      label: "Vendidos",
      value: sold,
      tone: "blue",
      icon: TrendingUp,
      status: "sold",
    },
  ] satisfies Array<{
    icon: typeof Car;
    label: string;
    status: InventoryListStatusFilter;
    tone: "blue" | "green" | "pink" | "violet";
    value: number;
  }>;

  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((stat, idx) => {
        const KpiIcon = stat.icon;
        const isActive = activeStatus === stat.status;
        const toneClass =
          stat.tone === "green"
            ? "kpi-gradient-green"
            : stat.tone === "blue"
              ? "kpi-gradient-blue"
              : stat.tone === "violet"
                ? "kpi-gradient-violet"
                : "kpi-gradient-pink";

        return (
          <AnimatedContent
            key={stat.label}
            className="flex min-w-[min(100%,12rem)] flex-[1_1_12rem]"
            distance={20}
            delay={idx * 0.04}
            duration={0.6}
            ease="power2.out"
          >
            <button
              aria-label={`Filtrar estoque por ${stat.label}`}
              aria-pressed={isActive}
              className={
                "kpi-card-premium flex items-center gap-3 !p-3 !px-4 !rounded-xl " +
                toneClass +
                " w-full border border-white/10 shadow-sm text-left text-white cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.015] " +
                (isActive
                  ? "ring-2 ring-white/70 ring-offset-2 ring-offset-app"
                  : "")
              }
              onClick={() => onStatusSelect(stat.status)}
              type="button"
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
                  <AnimatedCounter value={stat.value} />
                </strong>
              </div>
            </button>
          </AnimatedContent>
        );
      })}
    </div>
  );
}
