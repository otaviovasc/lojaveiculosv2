import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, MessageCircle, QrCode } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import type {
  CrmWhatsappComposioAuthorization,
  CrmWhatsappComposioCompleteResult,
  CrmWhatsappConnectionAllowance,
  CrmWhatsappCreateConnectionInput,
  CrmWhatsappConnectionId,
  CrmWhatsappOfficialSetupProvider,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
  CrmWhatsappZapiWebhookSetupResult,
} from "./crmWhatsappTypes";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import { CrmWhatsappChannelDirectory } from "./CrmWhatsappChannelDirectory";
import { CrmConnectionManageDialog } from "./CrmWhatsappConnectionAdminDialog";
import { CrmWhatsappOfficialSetup } from "./CrmWhatsappOfficialSetup";
import {
  clearPendingComposioConnection,
  isComposioConnectionForProvider,
  readPendingComposioConnection,
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
  onDisconnectZapi?: (
    connectionId: CrmWhatsappConnectionId,
  ) => Promise<CrmWhatsappProviderConnection>;
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
  onRefreshZapiStatus?: (
    connectionId: CrmWhatsappConnectionId,
  ) => Promise<CrmWhatsappProviderConnection>;
  onRequestZapiAddon?: () => Promise<CrmWhatsappZapiAddonContract>;
  onSetConnectionPaused?: (
    connectionId: CrmWhatsappConnectionId,
    paused: boolean,
  ) => Promise<void>;
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
  startAtDirectory = false,
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
  startAtDirectory?: boolean;
  zapiAddonContract?: CrmWhatsappZapiAddonContract | null;
}) {
  const [provider, setProvider] = useState<CrmWhatsappSetupProvider | null>(
    startAtDirectory ? null : readSetupProvider(existingConnection),
  );
  const [connection, setConnection] =
    useState<CrmWhatsappProviderConnection | null>(existingConnection);
  const [managedConnectionId, setManagedConnectionId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [completion, setCompletion] =
    useState<CrmWhatsappComposioCompleteResult | null>(null);
  const completingConnectionRef = useRef<string | null>(null);
  const setupSessionRef = useRef(0);

  const managedConnection = managedConnectionId
    ? (connections.find(
        (candidate) => String(candidate.id) === managedConnectionId,
      ) ?? null)
    : null;

  useEffect(() => {
    setConnection(existingConnection);
    const nextProvider = readSetupProvider(existingConnection);
    if (!startAtDirectory && nextProvider) {
      setProvider(nextProvider);
    }
  }, [existingConnection, startAtDirectory]);

  const chooseProvider = (nextProvider: CrmWhatsappSetupProvider) => {
    resetSetupProgress();
    setConnection(
      connections.find(
        (candidate) =>
          isConnectionForSetupProvider(candidate, nextProvider) &&
          candidate.status !== "archived",
      ) ??
        (existingConnection &&
        isConnectionForSetupProvider(existingConnection, nextProvider) &&
        existingConnection.status !== "archived"
          ? existingConnection
          : null),
    );
    setProvider(nextProvider);
  };

  const closeSetup = () => {
    resetSetupProgress();
    setConnection(null);
    setProvider(null);
  };

  function resetSetupProgress() {
    setupSessionRef.current += 1;
    completingConnectionRef.current = null;
    setCompletion(null);
    setError(null);
    setIsBusy(false);
  }

  const completeOfficialSetup = useCallback(
    async (
      connectionId: string,
      officialProvider: CrmWhatsappOfficialSetupProvider,
    ) => {
      if (completingConnectionRef.current === connectionId) return;
      const setupSession = setupSessionRef.current;
      completingConnectionRef.current = connectionId;
      setIsBusy(true);
      setError(null);
      try {
        const result = await handlers.onCompleteComposio(connectionId);
        if (
          String(result.connection.id) !== connectionId ||
          !isComposioConnectionForProvider(result.connection, officialProvider)
        ) {
          throw new Error(
            "O provedor retornou uma conexão diferente da autorização iniciada.",
          );
        }
        if (setupSession !== setupSessionRef.current) return;
        setConnection(result.connection);
        setCompletion(result);
        if (!result.senders.length) await handlers.onRefreshConnections();
        clearPendingComposioConnection();
      } catch (caught) {
        if (setupSession !== setupSessionRef.current) return;
        setError(
          formatApiErrorDisplay(
            caught,
            "A autorização retornou, mas ainda não foi confirmada. Tente verificar novamente.",
          ),
        );
      } finally {
        if (setupSession === setupSessionRef.current) {
          completingConnectionRef.current = null;
          setIsBusy(false);
        }
      }
    },
    [handlers],
  );

  useEffect(() => {
    if (!isOfficialSetupProvider(provider) || !connection) return;
    const pending = readPendingComposioConnection();
    if (
      pending?.connectionId === String(connection.id) &&
      pending.provider === provider &&
      isComposioConnectionForProvider(connection, provider)
    ) {
      void completeOfficialSetup(pending.connectionId, provider);
    }
  }, [completeOfficialSetup, connection, provider]);

  return (
    <>
      {!canSetup ? (
        <div className="crm-whatsapp-setup-notice" role="note">
          {canPair
            ? "Você pode consultar e parear conexões existentes. Para adicionar ou alterar canais, seu usuário precisa das permissões de gerenciar conexões e integrações."
            : "Você pode consultar conexões existentes. Para adicionar ou alterar canais, seu usuário precisa das permissões de gerenciar conexões e integrações."}
        </div>
      ) : null}
      <CrmWhatsappChannelDirectory
        availableProviders={availableProviders}
        connections={connections}
        {...(marketplaceApi ? { marketplaceApi } : {})}
        onChoose={chooseProvider}
        onConnectionsChanged={handlers.onRefreshConnections}
        onManageConnection={(candidate) =>
          setManagedConnectionId(String(candidate.id))
        }
        onRedirect={onRedirect}
        showSetupActions={canSetup}
        zapiAddonContract={zapiAddonContract}
      />
      <FeatureDialog
        className="feature-dialog--medium crm-connection-dialog"
        icon={
          provider === "composio_instagram" ? (
            <Camera />
          ) : provider === "composio_whatsapp" ? (
            <MessageCircle />
          ) : (
            <QrCode />
          )
        }
        isOpen={provider !== null}
        onClose={closeSetup}
        title={
          provider === "zapi"
            ? "Conectar WhatsApp · Z-API"
            : provider === "composio_instagram"
              ? "Configurar Instagram Oficial"
              : "Configurar WhatsApp Oficial"
        }
      >
        {provider === "zapi" ? (
          <CrmWhatsappZapiSetup
            allowance={allowance}
            canPair={canPair}
            canSetup={canSetup}
            connection={connection?.provider === "zapi" ? connection : null}
            handlers={handlers}
            onBack={closeSetup}
            onConnection={setConnection}
            zapiAddonContract={zapiAddonContract}
          />
        ) : isOfficialSetupProvider(provider) ? (
          <CrmWhatsappOfficialSetup
            completion={completion}
            canSetup={canSetup}
            connection={
              connection &&
              isComposioConnectionForProvider(connection, provider)
                ? connection
                : null
            }
            error={error}
            handlers={handlers}
            isBusy={isBusy}
            onBack={closeSetup}
            onComplete={() =>
              connection
                ? void completeOfficialSetup(String(connection.id), provider)
                : null
            }
            onConnection={setConnection}
            onError={setError}
            onRedirect={onRedirect}
            onStartBusy={setIsBusy}
            provider={provider}
          />
        ) : null}
      </FeatureDialog>
      <CrmConnectionManageDialog
        canManage={canSetup}
        connection={managedConnection}
        isRefreshing={isBusy}
        onClose={() => setManagedConnectionId(null)}
        onRefresh={handlers.onRefreshConnections}
        {...(handlers.onSetConnectionPaused
          ? { onSetConnectionPaused: handlers.onSetConnectionPaused }
          : {})}
      />
    </>
  );
}

function isOfficialSetupProvider(
  provider: CrmWhatsappSetupProvider | null,
): provider is CrmWhatsappOfficialSetupProvider {
  return provider === "composio_instagram" || provider === "composio_whatsapp";
}

function isConnectionForSetupProvider(
  connection: CrmWhatsappProviderConnection,
  provider: CrmWhatsappSetupProvider,
) {
  return provider === "zapi"
    ? connection.provider === "zapi"
    : isComposioConnectionForProvider(connection, provider);
}

function readSetupProvider(
  connection: CrmWhatsappProviderConnection | null | undefined,
): CrmWhatsappSetupProvider | null {
  if (!connection) return null;
  if (connection?.provider === "zapi") return "zapi";
  if (isComposioConnectionForProvider(connection, "composio_instagram"))
    return "composio_instagram";
  if (isComposioConnectionForProvider(connection, "composio_whatsapp"))
    return "composio_whatsapp";
  return null;
}
