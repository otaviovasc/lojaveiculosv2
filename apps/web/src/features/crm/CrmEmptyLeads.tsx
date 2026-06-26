import { Inbox } from "lucide-react";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";

export function EmptyLeads() {
  return (
    <FeatureEmptyState
      body="Ajuste os filtros ou crie um lead manual."
      icon={Inbox}
      title="Nenhum lead encontrado"
    />
  );
}
