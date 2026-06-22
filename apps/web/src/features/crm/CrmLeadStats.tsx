import { CheckCircle2, Clock3, Inbox, TimerReset } from "lucide-react";
import type { ReactElement } from "react";
import type { ProductCrmLeadActivity } from "./productCrmTypes";
import type { ProductCrmLead } from "./productCrmTypes";
import { deriveLeadStats } from "./crmPipelineModels";

export function LeadStatsStrip({
  activities,
  leads,
}: {
  activities: ProductCrmLeadActivity[];
  leads: ProductCrmLead[];
}) {
  const stats = deriveLeadStats(leads, activities);

  return (
    <section className="crm-stats-grid">
      <StatTile icon={<Inbox />} label="Total de leads" value={stats.total} />
      <StatTile icon={<Clock3 />} label="Em atendimento" value={stats.open} />
      <StatTile icon={<CheckCircle2 />} label="Ganhos" value={stats.won} />
      <StatTile
        icon={<TimerReset />}
        label="Tarefas vencidas"
        value={stats.overdueTasks}
      />
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactElement;
  label: string;
  value: number;
}) {
  return (
    <article className="crm-stat-tile">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
