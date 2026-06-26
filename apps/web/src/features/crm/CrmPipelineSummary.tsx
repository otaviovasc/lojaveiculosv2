import { CalendarPlus, UserCheck, Users } from "lucide-react";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";

type CrmPipelineSummaryProps = {
  activeClients: number;
  newClients30Days: number;
  totalClients: number;
};

export function CrmPipelineSummary({
  activeClients,
  newClients30Days,
  totalClients,
}: CrmPipelineSummaryProps) {
  return (
    <FeatureKpiStrip ariaLabel="Resumo de clientes">
      <FeatureKpiCard
        icon={Users}
        label="Total de clientes"
        tone="violet"
        value={totalClients}
      />
      <FeatureKpiCard
        icon={UserCheck}
        label="Clientes ativos"
        tone="green"
        value={activeClients}
      />
      <FeatureKpiCard
        icon={CalendarPlus}
        label="Novos em 30 dias"
        tone="blue"
        value={newClients30Days}
      />
    </FeatureKpiStrip>
  );
}
