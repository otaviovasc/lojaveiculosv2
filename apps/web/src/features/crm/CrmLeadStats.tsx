import { CheckCircle2, Clock3, Inbox, TimerReset } from "lucide-react";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
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
    <FeatureKpiStrip ariaLabel="Resumo de leads">
      <FeatureKpiCard
        icon={Inbox}
        label="Total de leads"
        tone="blue"
        value={stats.total}
      />
      <FeatureKpiCard
        icon={Clock3}
        label="Em atendimento"
        tone="violet"
        value={stats.open}
      />
      <FeatureKpiCard
        icon={CheckCircle2}
        label="Ganhos"
        tone="green"
        value={stats.won}
      />
      <FeatureKpiCard
        icon={TimerReset}
        label="Tarefas vencidas"
        tone="pink"
        value={stats.overdueTasks}
      />
    </FeatureKpiStrip>
  );
}
