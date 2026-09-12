import { Bot, LockKeyhole, TriangleAlert } from "lucide-react";
import { FeatureAlert } from "../../components/ui/FeatureStates";

export function AutoEntriesNotices({
  canManage,
  sellerError,
}: {
  canManage: boolean;
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
      {sellerError ? (
        <FeatureAlert
          className="auto-entries-shell-notice auto-entries-warning-banner"
          icon={<TriangleAlert aria-hidden="true" className="size-5" />}
          title={
            <span className="auto-entries-notice-header">
              <span className="auto-entries-notice-title">
                Lista de responsáveis indisponível
              </span>
              <span className="auto-entries-notice-badge auto-entries-notice-badge--warning">
                Aviso operacional
              </span>
            </span>
          }
          tone="warning"
        >
          <div className="auto-entries-notice-text-wrap">
            <p className="auto-entries-notice-body">{sellerError}</p>
          </div>
        </FeatureAlert>
      ) : null}
    </>
  );
}
