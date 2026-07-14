import { CircleDollarSign, LockKeyhole, TriangleAlert } from "lucide-react";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { AutoEntryFeedback } from "./useAutoEntryRules";

export function AutoEntriesNotices({
  activeSaleTab,
  canManage,
  feedback,
  sellerError,
}: {
  activeSaleTab: boolean;
  canManage: boolean;
  feedback: AutoEntryFeedback | null;
  sellerError: string | null;
}) {
  return (
    <>
      {!canManage ? (
        <FeatureAlert
          icon={<LockKeyhole aria-hidden="true" className="size-5" />}
          title="Somente leitura"
          tone="info"
        >
          <p>
            Você pode consultar as regras, mas precisa da permissão de gestão de
            lançamentos automáticos para criar, editar, ativar ou excluir.
          </p>
        </FeatureAlert>
      ) : null}
      {activeSaleTab ? (
        <FeatureAlert
          icon={<CircleDollarSign aria-hidden="true" className="size-5" />}
          title="Receita da venda preservada"
          tone="info"
        >
          <p>
            A receita principal continua sendo gerada pelos pagamentos do
            fechamento. As regras de Venda criam apenas comissões auxiliares.
          </p>
        </FeatureAlert>
      ) : null}
      {sellerError ? (
        <FeatureAlert
          icon={<TriangleAlert aria-hidden="true" className="size-5" />}
          title="Lista de responsáveis indisponível"
          tone="warning"
        >
          <p>{sellerError}</p>
        </FeatureAlert>
      ) : null}
      {feedback ? (
        <FeatureAlert tone={feedback.tone}>{feedback.message}</FeatureAlert>
      ) : null}
    </>
  );
}
