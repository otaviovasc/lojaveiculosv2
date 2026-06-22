import type { DashboardStat } from "../app/dashboardData";

export function StatCard({ stat }: { stat: DashboardStat }) {
  const Icon = stat.icon;

  return (
    <article className={`stat-card stat-card-${stat.tone}`}>
      <div className="relative z-10">
        <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-white-soft">
          <Icon aria-hidden="true" className="size-6" />
        </div>
        <p className="text-3xl font-black leading-none">{stat.value}</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white-muted">
          {stat.label}
        </p>
        <p className="mt-2 text-xs font-bold text-white-muted">
          {stat.deltaLabel}
        </p>
      </div>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-3 size-24 rotate-12 text-white-ghost"
      />
    </article>
  );
}
