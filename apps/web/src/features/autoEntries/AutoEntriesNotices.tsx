import {
  Bot,
  CircleDollarSign,
  LockKeyhole,
  TriangleAlert,
} from "lucide-react";
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
        <section
          aria-label="Permissão de gestão de lançamentos automáticos"
          className="auto-entries-readonly-panel"
          role="status"
        >
          <div
            aria-hidden="true"
            className="auto-entries-readonly-panel__background-icon"
          >
            <Bot />
          </div>
          <div className="auto-entries-readonly-panel__icon" aria-hidden="true">
            <LockKeyhole />
          </div>
          <div className="auto-entries-readonly-panel__content">
            <div className="auto-entries-readonly-panel__meta">
              <span className="auto-entries-readonly-panel__eyebrow">
                <LockKeyhole aria-hidden="true" className="size-3.5" />
                Permissão de gestão
              </span>
              <span className="auto-entries-readonly-panel__status">
                Somente leitura
              </span>
            </div>
            <h2>Consulte a automação com tranquilidade</h2>
            <p>
              As regras e a cobertura financeira ficam disponíveis para
              consulta. Para criar, editar, ativar ou excluir regras, peça a
              permissão de gestão de lançamentos automáticos a um administrador
              da loja.
            </p>
          </div>
          <div className="auto-entries-readonly-panel__note">
            <span className="auto-entries-readonly-panel__note-label">
              Acesso atual
            </span>
            <strong>Visualização segura</strong>
            <span>
              As configurações continuam protegidas contra alterações.
            </span>
          </div>
        </section>
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
