import {
  AlertCircle,
  Camera,
  ExternalLink,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";
import {
  isComposioConnectionForProvider,
  rememberPendingComposioConnection,
} from "./crmWhatsappComposioOAuth";
import type {
  CrmWhatsappComposioCompleteResult,
  CrmWhatsappOfficialSetupProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

export function CrmWhatsappOfficialSetup({
  canSetup,
  completion,
  connection,
  error,
  handlers,
  isBusy,
  onBack,
  onComplete,
  onConnection,
  onError,
  onRedirect,
  onStartBusy,
  provider,
}: {
  canSetup: boolean;
  completion: CrmWhatsappComposioCompleteResult | null;
  connection: CrmWhatsappProviderConnection | null;
  error: string | null;
  handlers: CrmWhatsappSelfServiceHandlers;
  isBusy: boolean;
  onBack: () => void;
  onComplete: () => void;
  onConnection: (connection: CrmWhatsappProviderConnection) => void;
  onError: (error: string | null) => void;
  onRedirect: (url: string) => void;
  onStartBusy: (busy: boolean) => void;
  provider: CrmWhatsappOfficialSetupProvider;
}) {
  const presentation = readOfficialSetupPresentation(provider);
  const authorize = async () => {
    if (!canSetup) return;
    onStartBusy(true);
    onError(null);
    try {
      const created = connection ?? (await handlers.onCreate({ provider }));
      if (!created) throw new Error("Conexão não criada.");
      if (!isComposioConnectionForProvider(created, provider)) {
        throw new Error("O servidor criou uma conexão para outro canal.");
      }
      onConnection(created);
      const authorization = await handlers.onAuthorizeComposio(
        String(created.id),
      );
      rememberPendingComposioConnection(String(created.id), provider);
      onRedirect(authorization.redirectUrl);
    } catch (caught) {
      onError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível iniciar a autorização oficial.",
        ),
      );
      onStartBusy(false);
    }
  };

  const selectSender = async (senderId: string) => {
    if (!canSetup || !connection) return;
    onStartBusy(true);
    onError(null);
    try {
      await handlers.onSelectComposioSender(String(connection.id), senderId);
      await handlers.onRefreshConnections();
    } catch (caught) {
      onError(
        formatApiErrorDisplay(
          caught,
          `${presentation.senderErrorSubject} não foi selecionado. A conexão ainda não está pronta.`,
        ),
      );
    } finally {
      onStartBusy(false);
    }
  };

  return (
    <section className="crm-whatsapp-setup-card crm-whatsapp-setup-card-flat">
      <OfficialSetupRail
        completion={completion}
        connection={connection}
        provider={provider}
      />
      <p className="crm-whatsapp-setup-intro">
        A autorização abre em página inteira. O canal só será exibido como
        conectado depois da confirmação do provedor e da escolha de{" "}
        {presentation.senderArticle} {presentation.senderLabel}.
      </p>
      {completion?.senders.length ? (
        <div className="crm-whatsapp-official-stage" data-state="senders">
          <p className="crm-whatsapp-official-stage-label">
            Autorização confirmada
          </p>
          <p className="crm-whatsapp-official-stage-note">
            O provedor confirmou a autorização. Escolha{" "}
            {presentation.senderArticle} {presentation.senderLabel} para
            concluir a conexão do canal.
          </p>
          <fieldset className="crm-whatsapp-official-senders">
            <legend>
              Escolha {presentation.senderArticle} {presentation.senderLabel}
            </legend>
            {completion.senders.map((sender) => (
              <button
                className="crm-action crm-action-secondary justify-start"
                disabled={isBusy || !canSetup}
                key={sender.senderId}
                onClick={() => void selectSender(sender.senderId)}
                type="button"
              >
                {provider === "composio_instagram" ? (
                  <Camera aria-hidden="true" className="size-4" />
                ) : (
                  <MessageCircle aria-hidden="true" className="size-4" />
                )}
                {sender.displayName || sender.phone || sender.senderId}
              </button>
            ))}
          </fieldset>
        </div>
      ) : connection?.live.providerStatus === "connected" ? (
        <div className="crm-whatsapp-official-stage" data-state="connected">
          <p className="crm-whatsapp-official-stage-label">Canal conectado</p>
          <p className="crm-whatsapp-official-stage-note">
            {presentation.connectedCopy}
          </p>
          <button
            className="crm-action crm-action-secondary"
            disabled={isBusy || !canSetup}
            onClick={() => void authorize()}
            type="button"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Reautorizar com a Meta
          </button>
        </div>
      ) : connection ? (
        <div className="crm-whatsapp-official-stage" data-state="awaiting">
          <p className="crm-whatsapp-official-stage-label">
            Aguardando retorno do provedor
          </p>
          <p className="crm-whatsapp-official-stage-note">
            A autorização foi iniciada na página da Meta, mas o canal ainda não
            está conectado. Nenhuma operação oficial foi concluída até a
            confirmação do provedor.
          </p>
          <div className="crm-whatsapp-official-stage-actions">
            <button
              className="crm-action crm-action-primary"
              disabled={isBusy || !canSetup}
              onClick={onComplete}
              type="button"
            >
              {isBusy ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : null}
              Verificar autorização
            </button>
            <button
              className="crm-action crm-action-secondary"
              disabled={isBusy || !canSetup}
              onClick={() => void authorize()}
              type="button"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              Reabrir autorização com a Meta
            </button>
          </div>
        </div>
      ) : (
        <button
          className="crm-action crm-action-primary"
          disabled={isBusy || !canSetup}
          onClick={() => void authorize()}
          type="button"
        >
          {isBusy ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ExternalLink aria-hidden="true" className="size-4" />
          )}
          Autorizar com a Meta
        </button>
      )}
      <SetupError error={error} />
      {connection && error ? (
        <button
          className="crm-action crm-action-secondary justify-self-start"
          disabled={isBusy || !canSetup}
          onClick={onComplete}
          type="button"
        >
          Verificar autorização novamente
        </button>
      ) : null}
      {!connection ? (
        <button
          className="crm-action crm-action-secondary"
          disabled={isBusy}
          onClick={onBack}
          type="button"
        >
          Voltar
        </button>
      ) : null}
    </section>
  );
}

function OfficialSetupRail({
  completion,
  connection,
  provider,
}: {
  completion: CrmWhatsappComposioCompleteResult | null;
  connection: CrmWhatsappProviderConnection | null;
  provider: CrmWhatsappOfficialSetupProvider;
}) {
  const presentation = readOfficialSetupPresentation(provider);
  const state = completion?.senders.length
    ? {
        evidence: "A autorização Meta foi confirmada pelo servidor.",
        next: `Escolher ${presentation.senderArticle} ${presentation.senderLabel}.`,
        state: presentation.pendingState,
      }
    : connection
      ? {
          evidence:
            "A conexão foi criada; o provedor ainda não confirmou o canal.",
          next: "Verificar o retorno ou reabrir a autorização.",
          state: "Confirmação pendente",
        }
      : {
          evidence: "Nenhuma operação oficial foi iniciada.",
          next: "Abrir a autorização segura da Meta.",
          state: "Não iniciado",
        };

  return (
    <dl
      className="crm-whatsapp-setup-rail"
      aria-label="Andamento da configuração"
    >
      <div data-kind="state">
        <dt>Estado atual</dt>
        <dd>{state.state}</dd>
      </div>
      <div data-kind="next">
        <dt>Próxima ação</dt>
        <dd>{state.next}</dd>
      </div>
      <div data-kind="evidence">
        <dt>Evidência</dt>
        <dd>{state.evidence}</dd>
      </div>
    </dl>
  );
}

function SetupError({ error }: { error: string | null }) {
  return error ? (
    <p className="crm-whatsapp-official-error" role="alert">
      <AlertCircle aria-hidden="true" />
      <span>{error}</span>
    </p>
  ) : null;
}

function readOfficialSetupPresentation(
  provider: CrmWhatsappOfficialSetupProvider,
) {
  return provider === "composio_instagram"
    ? {
        connectedCopy:
          "A conta e o perfil do Instagram já estão confirmados. Reautorize somente se a Meta pedir uma nova conexão.",
        pendingState: "Perfil pendente",
        senderArticle: "o",
        senderErrorSubject: "O perfil do Instagram",
        senderLabel: "perfil do Instagram",
      }
    : {
        connectedCopy:
          "A conta e o número do WhatsApp já estão confirmados. Reautorize somente se a Meta pedir uma nova conexão.",
        pendingState: "Número pendente",
        senderArticle: "o",
        senderErrorSubject: "O número do WhatsApp",
        senderLabel: "número do WhatsApp",
      };
}
