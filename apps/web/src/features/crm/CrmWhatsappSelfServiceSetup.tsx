import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  ExternalLink,
  Loader2,
  MessageCircle,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type {
  CrmWhatsappComposioAuthorization,
  CrmWhatsappComposioCompleteResult,
  CrmWhatsappConnectionAllowance,
  CrmWhatsappCreateConnectionInput,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
} from "./crmWhatsappTypes";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import { crmWhatsappSupportUrl } from "./crmWhatsappSupport";
import { ConnectionSectionCard } from "./CrmWhatsappConnectionAdminParts";
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
  onRefreshConnections: () => Promise<void>;
  onSelectComposioSender: (
    connectionId: string,
    senderId: string,
  ) => Promise<CrmWhatsappProviderConnection>;
};

export function CrmWhatsappSelfServiceSetup({
  allowance,
  availableProviders,
  canManage,
  existingConnection = null,
  handlers,
  onRedirect = (url) => window.location.assign(url),
}: {
  allowance: CrmWhatsappConnectionAllowance;
  availableProviders: CrmWhatsappSetupProvider[];
  canManage: boolean;
  existingConnection?: CrmWhatsappProviderConnection | null;
  handlers: CrmWhatsappSelfServiceHandlers;
  onRedirect?: (url: string) => void;
}) {
  const [provider, setProvider] = useState<CrmWhatsappSetupProvider | null>(
    existingConnection?.provider === "composio_whatsapp"
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

  if (!canManage) {
    return (
      <SetupNotice>
        Para adicionar um canal, seu usuário precisa das permissões de gerenciar
        conexões e integrações.
      </SetupNotice>
    );
  }

  if (!connection && allowance.remaining <= 0) {
    return (
      <SetupNotice>
        O limite de {allowance.limit} conexão
        {allowance.limit === 1 ? "" : "ões"} foi atingido. Arquive uma conexão
        ou ajuste o plano antes de adicionar outro canal. O Instagram continua
        incluído no CRM sem custo adicional; fale com o suporte para revisar a
        configuração assistida.
        <a
          className="font-bold text-accent-strong"
          href={crmWhatsappSupportUrl()}
          rel="noreferrer"
          target="_blank"
        >
          Falar com o suporte
        </a>
      </SetupNotice>
    );
  }

  if (!provider) {
    return (
      <ProviderChooser
        availableProviders={availableProviders}
        onChoose={setProvider}
      />
    );
  }

  if (provider === "zapi") {
    return <CrmWhatsappZapiSetup onBack={() => setProvider(null)} />;
  }

  return (
    <OfficialSetup
      completion={completion}
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

function ProviderChooser({
  availableProviders,
  onChoose,
}: {
  availableProviders: CrmWhatsappSetupProvider[];
  onChoose: (provider: CrmWhatsappSetupProvider) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-label="Adicionar canal">
      {!availableProviders.length ? (
        <SetupNotice>
          Os canais com configuração direta já estão conectados nesta loja.
        </SetupNotice>
      ) : null}
      {availableProviders.includes("zapi") ? (
        <ProviderOption
          description="Adicional contratado na assinatura, ativado no próximo vencimento e configurado pela nossa equipe."
          icon={<QrCode aria-hidden="true" />}
          label="Z-API"
          onClick={() => onChoose("zapi")}
        />
      ) : null}
      {availableProviders.includes("composio_whatsapp") ? (
        <ProviderOption
          description="Autorize a conta Meta em uma página segura e escolha o número remetente."
          icon={<ShieldCheck aria-hidden="true" />}
          label="WhatsApp Oficial"
          onClick={() => onChoose("composio_whatsapp")}
        />
      ) : null}
      <ConnectionSectionCard
        description="Sem custo adicional no CRM. A configuração é feita com ajuda da nossa equipe."
        icon={<Camera aria-hidden="true" />}
        title="Instagram incluído"
      >
        <a
          className="crm-whatsapp-connection-save"
          href={crmWhatsappSupportUrl()}
          rel="noreferrer"
          target="_blank"
        >
          Pedir ajuda para configurar
        </a>
      </ConnectionSectionCard>
    </div>
  );
}

function ProviderOption({
  description,
  icon,
  label,
  onClick,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-36 items-start gap-3 rounded-xl border border-line/45 bg-panel/15 p-4 text-left transition hover:border-strong/35 hover:bg-panel/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={onClick}
      type="button"
    >
      <span className="rounded-lg bg-accent/10 p-2 text-accent">{icon}</span>
      <span className="grid flex-1 gap-1">
        <strong className="text-base text-text">{label}</strong>
        <span className="text-sm leading-relaxed text-muted">
          {description}
        </span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 text-muted" />
    </button>
  );
}

function OfficialSetup({
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
    if (!connection) return;
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
    <SetupCard title="WhatsApp Oficial">
      <p className="text-sm text-muted">
        A autorização abre em página inteira. O canal só será exibido como
        conectado depois da confirmação do provedor e da escolha do remetente.
      </p>
      {completion?.senders.length ? (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold text-text">
            Escolha o número remetente
          </legend>
          {completion.senders.map((sender) => (
            <button
              className="crm-action crm-action-secondary justify-start"
              disabled={isBusy}
              key={sender.senderId}
              onClick={() => void selectSender(sender.senderId)}
              type="button"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              {sender.displayName || sender.phone || sender.senderId}
            </button>
          ))}
        </fieldset>
      ) : (
        <button
          className="crm-action crm-action-primary"
          disabled={isBusy}
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
      {connection && error ? (
        <button
          className="crm-action crm-action-secondary"
          disabled={isBusy}
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
      <SetupError error={error} />
    </SetupCard>
  );
}

function SetupCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-line/40 bg-panel/10 p-4 md:p-5">
      <h2 className="text-lg font-extrabold text-text">{title}</h2>
      {children}
    </section>
  );
}

function SetupNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line/40 bg-panel/10 p-4 text-sm font-bold text-muted">
      {children}
    </div>
  );
}

function SetupError({ error }: { error: string | null }) {
  return error ? (
    <p className="text-sm font-bold text-danger" role="alert">
      {error}
    </p>
  ) : null;
}
