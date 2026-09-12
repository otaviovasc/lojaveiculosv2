import {
  AlertCircle,
  Camera,
  ExternalLink,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";
import {
  isComposioConnectionForProvider,
  rememberPendingComposioConnection,
} from "./crmComposioOAuth";
import type {
  CrmComposioCompleteResult,
  CrmOfficialChannelSetupProvider,
  CrmProviderConnection,
} from "./crmConversationTypes";

export function CrmOfficialChannelSetup({
  canSetup,
  channel,
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
  channel: "instagram" | "whatsapp";
  completion: CrmComposioCompleteResult | null;
  connection: CrmProviderConnection | null;
  error: string | null;
  handlers: CrmConnectionSelfServiceHandlers;
  isBusy: boolean;
  onBack: () => void;
  onComplete: () => void;
  onConnection: (connection: CrmProviderConnection) => void;
  onError: (error: string | null) => void;
  onRedirect: (url: string) => void;
  onStartBusy: (busy: boolean) => void;
  provider: CrmOfficialChannelSetupProvider;
}) {
  const presentation = readOfficialSetupPresentation(channel);
  const authorize = async () => {
    if (!canSetup) return;
    onStartBusy(true);
    onError(null);
    try {
      const created =
        connection ?? (await handlers.onCreate({ channel, provider }));
      if (!created) throw new Error("Conexão não criada.");
      if (!isComposioConnectionForProvider(created, channel)) {
        throw new Error("O servidor criou uma conexão para outro canal.");
      }
      onConnection(created);
      const authorization = await handlers.onAuthorizeComposio(
        String(created.id),
      );
      rememberPendingComposioConnection(String(created.id), channel);
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
    <section className="crm-setup-card crm-setup-card-flat">
      <OfficialSetupRail
        channel={channel}
        completion={completion}
        connection={connection}
        provider={provider}
      />
      <p className="crm-setup-intro">
        A autorização abre em página inteira. O canal só será exibido como
        conectado depois da confirmação do provedor e da escolha de{" "}
        {presentation.senderArticle} {presentation.senderLabel}.
      </p>
      {completion?.senders.length ? (
        <div className="crm-official-stage" data-state="senders">
          <p className="crm-official-stage-label">Autorização confirmada</p>
          <p className="crm-official-stage-note">
            O provedor confirmou a autorização. Escolha{" "}
            {presentation.senderArticle} {presentation.senderLabel} para
            concluir a conexão do canal.
          </p>
          <fieldset className="crm-official-senders">
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
                {provider === "meta_cloud" ? (
                  <Camera aria-hidden="true" className="size-4" />
                ) : (
                  <MessageCircle aria-hidden="true" className="size-4" />
                )}
                {sender.displayName || sender.phone || sender.senderId}
              </button>
            ))}
          </fieldset>
        </div>
      ) : connection?.live?.providerStatus === "connected" ? (
        <div className="crm-official-stage" data-state="connected">
          <p className="crm-official-stage-label">Canal conectado</p>
          <p className="crm-official-stage-note">
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
        <div className="crm-official-stage" data-state="awaiting">
          <p className="crm-official-stage-label">
            Aguardando retorno do provedor
          </p>
          <p className="crm-official-stage-note">
            A autorização foi iniciada na página da Meta, mas o canal ainda não
            está conectado. Nenhuma operação oficial foi concluída até a
            confirmação do provedor.
          </p>
          <div className="crm-official-stage-actions">
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
  channel,
  completion,
  connection,
  provider,
}: {
  channel: "instagram" | "whatsapp";
  completion: CrmComposioCompleteResult | null;
  connection: CrmProviderConnection | null;
  provider: CrmOfficialChannelSetupProvider;
}) {
  const presentation = readOfficialSetupPresentation(channel);
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
    <dl className="crm-setup-rail" aria-label="Andamento da configuração">
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
    <p className="crm-official-error" role="alert">
      <AlertCircle aria-hidden="true" />
      <span>{error}</span>
    </p>
  ) : null;
}

function readOfficialSetupPresentation(channel: "instagram" | "whatsapp") {
  return channel === "instagram"
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
