import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, MessageCircle, QrCode } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import type {
  CrmComposioAuthorization,
  CrmComposioCompleteResult,
  CrmAvailableSetup,
  CrmConnectionAllowance,
  CrmCreateConnectionInput,
  CrmConnectionId,
  CrmOfficialChannelSetupProvider,
  CrmProviderConnection,
  CrmSetupProvider,
  CrmWhatsappZapiAddonContract,
  CrmWhatsappZapiWebhookSetupResult,
} from "./crmConversationTypes";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import { CrmChannelDirectory } from "./CrmChannelDirectory";
import { CrmConnectionManageDialog } from "./CrmConnectionAdminDialog";
import { CrmOfficialChannelSetup } from "./CrmOfficialChannelSetup";
import {
  clearPendingComposioConnection,
  isComposioConnectionForProvider,
  readPendingComposioConnection,
} from "./crmComposioOAuth";

export type CrmConnectionSelfServiceHandlers = {
  onAuthorizeComposio: (
    connectionId: string,
  ) => Promise<CrmComposioAuthorization>;
  onCompleteComposio: (
    connectionId: string,
  ) => Promise<CrmComposioCompleteResult>;
  onCreate: (
    input: CrmCreateConnectionInput,
  ) => Promise<CrmProviderConnection | null>;
  onDisconnectZapi?: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  onConfigureZapiWebhooks: (connectionId: CrmConnectionId) => Promise<
    CrmWhatsappZapiWebhookSetupResult & {
      connection?: CrmProviderConnection;
    }
  >;
  onRefreshConnections: () => Promise<void>;
  onRequestZapiPairingCode?: (
    connectionId: CrmConnectionId,
    phone: string,
  ) => Promise<{
    code?: string;
    expiresAt?: string;
    requested: boolean;
  }>;
  onRequestZapiPairingQr?: (
    connectionId: CrmConnectionId,
  ) => Promise<{ expiresAt: string; qrCode: string }>;
  onRefreshZapiStatus?: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  onRequestZapiAddon?: () => Promise<CrmWhatsappZapiAddonContract>;
  onSetConnectionPaused?: (
    connectionId: CrmConnectionId,
    paused: boolean,
  ) => Promise<void>;
  onSelectComposioSender: (
    connectionId: string,
    senderId: string,
  ) => Promise<CrmProviderConnection>;
};

export function CrmConnectionSelfServiceSetup({
  allowance,
  availableSetups,
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
  allowance: CrmConnectionAllowance;
  availableSetups: readonly CrmAvailableSetup[];
  canPair: boolean;
  canSetup: boolean;
  connections?: readonly CrmProviderConnection[];
  existingConnection?: CrmProviderConnection | null;
  handlers: CrmConnectionSelfServiceHandlers;
  marketplaceApi?: MarketplaceApi;
  onRedirect?: (url: string) => void;
  startAtDirectory?: boolean;
  zapiAddonContract?: CrmWhatsappZapiAddonContract | null;
}) {
  const [provider, setProvider] = useState<CrmSetupProvider | null>(
    startAtDirectory ? null : readSetupProvider(existingConnection),
  );
  const [officialChannel, setOfficialChannel] = useState<
    "instagram" | "whatsapp"
  >(existingConnection?.channel === "instagram" ? "instagram" : "whatsapp");
  const [connection, setConnection] = useState<CrmProviderConnection | null>(
    existingConnection,
  );
  const [managedConnectionId, setManagedConnectionId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [completion, setCompletion] =
    useState<CrmComposioCompleteResult | null>(null);
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

  const selectedConnectionId = connection ? String(connection.id) : null;
  useEffect(() => {
    if (!selectedConnectionId) return;
    const refreshedConnection = connections.find(
      (candidate) => String(candidate.id) === selectedConnectionId,
    );
    if (!refreshedConnection) return;
    setConnection((current) =>
      current && String(current.id) === selectedConnectionId
        ? refreshedConnection
        : current,
    );
  }, [connections, selectedConnectionId]);

  const chooseProvider = (
    nextProvider: CrmSetupProvider,
    nextChannel?: "instagram" | "whatsapp",
  ) => {
    resetSetupProgress();
    const channel = nextChannel ?? "whatsapp";
    setConnection(
      connections.find(
        (candidate) =>
          isConnectionForSetupProvider(candidate, nextProvider, channel) &&
          (candidate.state ?? candidate.status) !== "archived",
      ) ??
        (existingConnection &&
        isConnectionForSetupProvider(
          existingConnection,
          nextProvider,
          channel,
        ) &&
        (existingConnection.state ?? existingConnection.status) !== "archived"
          ? existingConnection
          : null),
    );
    setOfficialChannel(channel);
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
    async (connectionId: string, channel: "instagram" | "whatsapp") => {
      if (completingConnectionRef.current === connectionId) return;
      const setupSession = setupSessionRef.current;
      completingConnectionRef.current = connectionId;
      setIsBusy(true);
      setError(null);
      try {
        const result = await handlers.onCompleteComposio(connectionId);
        if (
          String(result.connection.id) !== connectionId ||
          !isComposioConnectionForProvider(result.connection, channel)
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
      pending.channel === officialChannel &&
      isComposioConnectionForProvider(connection, officialChannel)
    ) {
      void completeOfficialSetup(pending.connectionId, officialChannel);
    }
  }, [completeOfficialSetup, connection, officialChannel, provider]);

  return (
    <>
      {!canSetup ? (
        <div className="crm-setup-notice" role="note">
          {canPair
            ? "Você pode consultar e parear conexões existentes. Para adicionar ou alterar canais, seu usuário precisa das permissões de gerenciar conexões e integrações."
            : "Você pode consultar conexões existentes. Para adicionar ou alterar canais, seu usuário precisa das permissões de gerenciar conexões e integrações."}
        </div>
      ) : null}
      <CrmChannelDirectory
        availableSetups={[...availableSetups]}
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
        className="feature-dialog--large crm-connection-dialog"
        icon={
          officialChannel === "instagram" ? (
            <Camera />
          ) : provider === "meta_cloud" ? (
            <MessageCircle />
          ) : (
            <QrCode />
          )
        }
        isOpen={provider !== null}
        onClose={closeSetup}
        {...(provider === "zapi" ? { hideHeading: true } : {})}
        title={
          provider === "zapi"
            ? "Conectar WhatsApp · Z-API"
            : officialChannel === "instagram"
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
          <CrmOfficialChannelSetup
            completion={completion}
            canSetup={canSetup}
            connection={
              connection &&
              isComposioConnectionForProvider(connection, officialChannel)
                ? connection
                : null
            }
            error={error}
            handlers={handlers}
            isBusy={isBusy}
            onBack={closeSetup}
            onComplete={() =>
              connection
                ? void completeOfficialSetup(
                    String(connection.id),
                    officialChannel,
                  )
                : null
            }
            onConnection={setConnection}
            onError={setError}
            onRedirect={onRedirect}
            onStartBusy={setIsBusy}
            channel={officialChannel}
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
        {...(managedConnection?.provider === "zapi" &&
        handlers.onRefreshZapiStatus
          ? {
              onRefreshStatus: async () => {
                await handlers.onRefreshZapiStatus!(managedConnection.id);
              },
            }
          : {})}
        {...(handlers.onSetConnectionPaused
          ? { onSetConnectionPaused: handlers.onSetConnectionPaused }
          : {})}
      />
    </>
  );
}

function isOfficialSetupProvider(
  provider: CrmSetupProvider | null,
): provider is CrmOfficialChannelSetupProvider {
  return provider === "meta_cloud";
}

function isConnectionForSetupProvider(
  connection: CrmProviderConnection,
  provider: CrmSetupProvider,
  channel: "instagram" | "whatsapp",
) {
  return provider === "zapi"
    ? connection.provider === "zapi"
    : isComposioConnectionForProvider(connection, channel);
}

function readSetupProvider(
  connection: CrmProviderConnection | null | undefined,
): CrmSetupProvider | null {
  if (!connection) return null;
  if (connection?.provider === "zapi") return "zapi";
  if (connection.provider === "meta_cloud") return "meta_cloud";
  return null;
}
