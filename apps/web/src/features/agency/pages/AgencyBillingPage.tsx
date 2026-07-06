import { CreditCard } from "lucide-react";
import {
  FeaturePageHeader,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../../components/ui/FeatureStates";

export function AgencyBillingPage() {
  return (
    <FeaturePageShell variant="plain">
      <FeaturePageHeader
        description="Mostra somente cobrancas geradas por assinaturas, itens e pagamentos reais vinculados ao tenant da agencia."
        eyebrow="Financeiro"
        title="Cobranca unificada"
      />
      <FeatureEmptyState
        body="Ainda nao existem registros de assinatura recorrente da agencia neste tenant. Quando o cliente Asaas e os itens de assinatura do tenant forem criados, a cobranca consolidada aparece aqui."
        icon={CreditCard}
        title="Sem cobranca consolidada"
      />
    </FeaturePageShell>
  );
}
