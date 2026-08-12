import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import type {
  CrmWhatsappComposioAuthorization,
  CrmWhatsappComposioCompleteResult,
  CrmWhatsappConnectionAllowance,
  CrmWhatsappCreateConnectionInput,
  CrmWhatsappConnectionId,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
  CrmWhatsappZapiWebhookSetupResult,
} from "./crmWhatsappTypes";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import { CrmWhatsappChannelDirectory } from "./CrmWhatsappChannelDirectory";
import {
  clearPendingComposioConnection,
  readPendingComposioConnectionId,
  rememberPendingComposioConnection,
} from "./crmWhatsappComposioOAuth";

export type CrmWhatsappSelfServiceHandlers = {
  onAuthorizeComposio: (
    connectionId: string,
  ) => Promise<CrmWhatsappComposioAuthorization>;
  onCompleteComposio: (
    connectionId: string,
  ) => Promise<CrmWhatsappComposioCompleteResult>;
  onCreate: (
    input: CrmWhatsappCreateConnectionInput,
  ) => Promise<CrmWhatsappProviderConnection | null>;
  onConfigureZapiWebhooks: (connectionId: CrmWhatsappConnectionId) => Promise<
    CrmWhatsappZapiWebhookSetupResult & {
      connection?: CrmWhatsappProviderConnection;
    }
  >;
  onRefreshConnections: () => Promise<void>;
  onRequestZapiPairingCode?: (
    connectionId: CrmWhatsappConnectionId,
    phone: string,
  ) => Promise<{
    code?: string;
    expiresAt?: string;
    requested: boolean;
  }>;
  onRequestZapiPairingQr?: (
    connectionId: CrmWhatsappConnectionId,
  ) => Promise<{ expiresAt: string; qrCode: string }>;
  onRequestZapiAddon?: () => Promise<CrmWhatsappZapiAddonContract>;
  onSelectComposioSender: (
    connectionId: string,
    senderId: string,
  ) => Promise<CrmWhatsappProviderConnection>;
};

export function CrmWhatsappSelfServiceSetup({
  allowance,
  availableProviders,
  canPair,
  canSetup,
  connections = [],
  existingConnection = null,
  handlers,
  marketplaceApi,
  onRedirect = (url) => window.location.assign(url),
  zapiAddonContract = null,
}: {
  allowance: CrmWhatsappConnectionAllowance;
  availableProviders: CrmWhatsappSetupProvider[];
  canPair: boolean;
  canSetup: boolean;
  connections?: readonly CrmWhatsappProviderConnection[];
  existingConnection?: CrmWhatsappProviderConnection | null;
  handlers: CrmWhatsappSelfServiceHandlers;
  marketplaceApi?: MarketplaceApi;
  onRedirect?: (url: string) => void;
  zapiAddonContract?: CrmWhatsappZapiAddonContract | null;
}) {
  const [provider, setProvider] = useState<CrmWhatsappSetupProvider | null>(
    existingConnection?.provider === "zapi"
      ? "zapi"
      : existingConnection?.provider === "composio_whatsapp"
        ? "composio_whatsapp"
        : null,
  );
  const [connection, setConnection] =
    useState<CrmWhatsappProviderConnection | null>(existingConnection);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [completion, setCompletion] =
    useState<CrmWhatsappComposioCompleteResult | null>(null);
  const completingConnectionRef = useRef<string | null>(null);

  useEffect(() => {
    setConnection(existingConnection);
    if (
      existingConnection?.provider === "zapi" ||
      existingConnection?.provider === "composio_whatsapp"
    ) {
      setProvider(
        existingConnection.provider === "zapi" ? "zapi" : "composio_whatsapp",
      );
    }
  }, [existingConnection]);

  const completeOfficialSetup = useCallback(
    async (connectionId: string) => {
      if (completingConnectionRef.current === connectionId) return;
      completingConnectionRef.current = connectionId;
      setIsBusy(true);
      setError(null);
      try {
        const result = await handlers.onCompleteComposio(connectionId);
        setConnection(result.connection);
        setCompletion(result);
        if (!result.senders.length) await handlers.onRefreshConnections();
        clearPendingComposioConnection();
      } catch (caught) {
        setError(
          formatApiErrorDisplay(
            caught,
            "A autorização retornou, mas ainda não foi confirmada. Tente verificar novamente.",
          ),
        );
      } finally {
        completingConnectionRef.current = null;
        setIsBusy(false);
      }
    },
    [handlers],
  );

  useEffect(() => {
    if (provider !== "composio_whatsapp" || !connection) return;
    const pendingId = readPendingComposioConnectionId();
    if (pendingId === String(connection.id)) {
      void completeOfficialSetup(pendingId);
    }
  }, [completeOfficialSetup, connection, provider]);

  if (!connection && !canSetup) {
    return (
      <SetupNotice>
        Para adicionar um canal, seu usuário precisa das permissões de gerenciar
        conexões e integrações.
      </SetupNotice>
    );
  }

  if (!provider) {
    return (
      <CrmWhatsappChannelDirectory
        availableProviders={availableProviders}
        connections={connections}
        {...(marketplaceApi ? { marketplaceApi } : {})}
        onChoose={setProvider}
        onRedirect={onRedirect}
        zapiAddonContract={zapiAddonContract}
      />
    );
  }

  if (provider === "zapi") {
    return (
      <CrmWhatsappZapiSetup
        allowance={allowance}
        canPair={canPair}
        canSetup={canSetup}
        connection={connection?.provider === "zapi" ? connection : null}
        handlers={handlers}
        onBack={() => setProvider(null)}
        onConnection={setConnection}
        zapiAddonContract={zapiAddonContract}
      />
    );
  }

  return (
    <OfficialSetup
      completion={completion}
      canSetup={canSetup}
      connection={
        connection?.provider === "composio_whatsapp" ? connection : null
      }
      error={error}
      handlers={handlers}
      isBusy={isBusy}
      onBack={() => setProvider(null)}
      onComplete={() =>
        connection ? void completeOfficialSetup(String(connection.id)) : null
      }
      onConnection={setConnection}
      onError={setError}
      onRedirect={onRedirect}
      onStartBusy={setIsBusy}
    />
  );
}

function OfficialSetup({
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
}) {
  const authorize = async () => {
    if (!canSetup) return;
    onStartBusy(true);
    onError(null);
    try {
      const created =
        connection ??
        (await handlers.onCreate({ provider: "composio_whatsapp" }));
      if (!created) throw new Error("Conexão não criada.");
      onConnection(created);
      const authorization = await handlers.onAuthorizeComposio(
        String(created.id),
      );
      rememberPendingComposioConnection(String(created.id));
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
          "O remetente não foi selecionado. A conexão ainda não está pronta.",
        ),
      );
    } finally {
      onStartBusy(false);
    }
  };

  return (
    <SetupCard
      broker="Composio"
      channel="WhatsApp"
      title="WhatsApp Oficial"
      transport="Meta Cloud"
    >
      <OfficialSetupRail completion={completion} connection={connection} />
      <p className="crm-whatsapp-setup-intro">
        A autorização abre em página inteira. O canal só será exibido como
        conectado depois da confirmação do provedor e da escolha do remetente.
      </p>
      {completion?.senders.length ? (
        <div className="crm-whatsapp-official-stage" data-state="senders">
          <p className="crm-whatsapp-official-stage-label">
            Autorização confirmada
          </p>
          <p className="crm-whatsapp-official-stage-note">
            O provedor confirmou a autorização. Escolha o número remetente para
            concluir a conexão do canal.
          </p>
          <fieldset className="crm-whatsapp-official-senders">
            <legend>Escolha o número remetente</legend>
            {completion.senders.map((sender) => (
              <button
                className="crm-action crm-action-secondary justify-start"
                disabled={isBusy || !canSetup}
                key={sender.senderId}
                onClick={() => void selectSender(sender.senderId)}
                type="button"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                {sender.displayName || sender.phone || sender.senderId}
              </button>
            ))}
          </fieldset>
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
    </SetupCard>
  );
}

function SetupCard({
  broker,
  channel,
  children,
  title,
  transport,
}: {
  broker: string;
  channel: string;
  children: React.ReactNode;
  title: string;
  transport: string;
}) {
  return (
    <section className="crm-whatsapp-setup-card">
      <header className="crm-whatsapp-setup-card-heading">
        <span>Configuração do canal</span>
        <h2>{title}</h2>
        <p>
          Canal {channel} · Transporte {transport} · Credencial {broker}
        </p>
      </header>
      {children}
    </section>
  );
}

function OfficialSetupRail({
  completion,
  connection,
}: {
  completion: CrmWhatsappComposioCompleteResult | null;
  connection: CrmWhatsappProviderConnection | null;
}) {
  const state = completion?.senders.length
    ? {
        evidence: "A autorização Meta foi confirmada pelo servidor.",
        next: "Escolher o número que enviará as mensagens.",
        state: "Remetente pendente",
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

function SetupNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-whatsapp-setup-notice" role="note">
      {children}
    </div>
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
