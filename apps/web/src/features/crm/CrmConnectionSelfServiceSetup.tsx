import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, MessageCircle, QrCode } from "lucide-react";
import type { CrmConnectionAllowance } from "@lojaveiculosv2/shared";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import type {
  CrmComposioAuthorization,
  CrmComposioCompleteResult,
  CrmAvailableSetup,
  CrmConnectionMember,
  CrmConnectionMemberRevokeResult,
  CrmCreateConnectionInput,
  CrmConnectionId,
  CrmOfficialChannelSetupProvider,
  CrmProviderConnection,
  CrmSetupProvider,
  CrmWhatsappZapiWebhookSetupResult,
  CrmZapiCredentialsInput,
  CrmZapiReplacementInput,
  CrmZapiReplacementResult,
} from "./crmConversationTypes";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import { CrmWhatsappUazapiSetup } from "./CrmWhatsappUazapiSetup";
import { CrmChannelDirectory } from "./CrmChannelDirectory";
import { CrmConnectionManageDialog } from "./CrmConnectionAdminDialog";
import { CrmOfficialChannelSetup } from "./CrmOfficialChannelSetup";
import {
  clearPendingComposioConnection,
  isComposioConnectionForProvider,
  readPendingComposioConnection,
} from "./crmComposioOAuth";
import { needsConnectionRepair } from "./CrmChannelDirectoryParts";
import { isUiDemoConnection } from "./crmConnectionSelection";

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
  onDisconnectUazapi?: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  onConfigureUazapiWebhooks?: (connectionId: CrmConnectionId) => Promise<
    CrmWhatsappZapiWebhookSetupResult & {
      connection?: CrmProviderConnection;
    }
  >;
  onGrantConnectionMember?: (
    connectionId: CrmConnectionId,
    userId: string,
  ) => Promise<void>;
  onListConnectionMembers?: (
    connectionId: CrmConnectionId,
  ) => Promise<readonly CrmConnectionMember[]>;
  onRevokeConnectionMember?: (
    connectionId: CrmConnectionId,
    userId: string,
  ) => Promise<CrmConnectionMemberRevokeResult>;
  onConfigureZapiWebhooks: (connectionId: CrmConnectionId) => Promise<
    CrmWhatsappZapiWebhookSetupResult & {
      connection?: CrmProviderConnection;
    }
  >;
  onRefreshConnections: () => Promise<void>;
  onRefreshConnectionsWithPayload?: () => Promise<
    readonly CrmProviderConnection[] | void
  >;
  onRepairZapiCredentials?: (
    connectionId: CrmConnectionId,
    input: CrmZapiCredentialsInput,
  ) => Promise<CrmProviderConnection>;
  onReplaceZapiConnection?: (
    connectionId: CrmConnectionId,
    input: CrmZapiReplacementInput,
  ) => Promise<CrmZapiReplacementResult>;
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
  onRefreshUazapiStatus?: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  onRequestUazapiPairingCode?: (
    connectionId: CrmConnectionId,
    phone: string,
  ) => Promise<{
    code?: string;
    expiresAt?: string;
    requested: boolean;
  }>;
  onRequestUazapiPairingQr?: (
    connectionId: CrmConnectionId,
  ) => Promise<{ expiresAt: string; qrCode: string }>;
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
  availableSetups,
  canPair,
  canSetup,
  canRepairCredentials = false,
  connectionAllowance = null,
  connections = [],
  existingConnection = null,
  handlers,
  isCrmEntitled,
  marketplaceApi,
  onRedirect = (url) => window.location.assign(url),
  startAtDirectory = false,
}: {
  availableSetups: readonly CrmAvailableSetup[];
  canPair: boolean;
  canRepairCredentials?: boolean;
  canSetup: boolean;
  connectionAllowance?: CrmConnectionAllowance | null;
  connections?: readonly CrmProviderConnection[];
  existingConnection?: CrmProviderConnection | null;
  handlers: CrmConnectionSelfServiceHandlers;
  isCrmEntitled: boolean;
  marketplaceApi?: MarketplaceApi;
  onRedirect?: (url: string) => void;
  startAtDirectory?: boolean;
}) {
  const setupAllowed = canSetup;
  const initialConnection =
    existingConnection && !isUiDemoConnection(existingConnection)
      ? existingConnection
      : null;
  const [provider, setProvider] = useState<CrmSetupProvider | null>(
    startAtDirectory ? null : readSetupProvider(initialConnection),
  );
  const [officialChannel, setOfficialChannel] = useState<
    "instagram" | "whatsapp"
  >(initialConnection?.channel === "instagram" ? "instagram" : "whatsapp");
  const [connection, setConnection] = useState<CrmProviderConnection | null>(
    initialConnection,
  );
  const [managedConnectionId, setManagedConnectionId] = useState<string | null>(
    null,
  );
  const [initialZapiCredentialMode, setInitialZapiCredentialMode] = useState<
    "repair" | "replacement" | undefined
  >(
    initialConnection && needsConnectionRepair(initialConnection)
      ? "repair"
      : undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [completion, setCompletion] =
    useState<CrmComposioCompleteResult | null>(null);
  const completingConnectionRef = useRef<string | null>(null);
  const setupSessionRef = useRef(0);

  const managedConnection = managedConnectionId
    ? (connections.find(
        (candidate) =>
          String(candidate.id) === managedConnectionId &&
          !isUiDemoConnection(candidate),
      ) ?? null)
    : null;

  useEffect(() => {
    const candidate =
      existingConnection && !isUiDemoConnection(existingConnection)
        ? existingConnection
        : null;
    setConnection(candidate);
    const nextProvider = readSetupProvider(candidate);
    if (!startAtDirectory && nextProvider) {
      setProvider(nextProvider);
    }
  }, [existingConnection, startAtDirectory]);

  const selectedConnectionId = connection ? String(connection.id) : null;
  useEffect(() => {
    if (!selectedConnectionId) return;
    const refreshedConnection = connections.find(
      (candidate) =>
        String(candidate.id) === selectedConnectionId &&
        !isUiDemoConnection(candidate),
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
    setInitialZapiCredentialMode(undefined);
    const channel = nextChannel ?? "whatsapp";
    setConnection(
      connections.find(
        (candidate) =>
          isConnectionForSetupProvider(candidate, nextProvider, channel) &&
          (candidate.state ?? candidate.status) !== "archived" &&
          !isUiDemoConnection(candidate),
      ) ??
        (existingConnection &&
        isConnectionForSetupProvider(
          existingConnection,
          nextProvider,
          channel,
        ) &&
        (existingConnection.state ?? existingConnection.status) !==
          "archived" &&
        !isUiDemoConnection(existingConnection)
          ? existingConnection
          : null),
    );
    setOfficialChannel(channel);
    setProvider(nextProvider);
  };

  const chooseZapiCredentialSetup = (
    candidate: CrmProviderConnection,
    mode: "repair" | "replacement",
  ) => {
    resetSetupProgress();
    setInitialZapiCredentialMode(mode);
    setConnection(candidate);
    setOfficialChannel("whatsapp");
    setProvider("zapi");
  };

  const chooseConnectionForRepair = (candidate: CrmProviderConnection) => {
    chooseZapiCredentialSetup(candidate, "repair");
  };

  const chooseConnectionForReplacement = (candidate: CrmProviderConnection) => {
    chooseZapiCredentialSetup(candidate, "replacement");
  };

  const closeSetup = () => {
    resetSetupProgress();
    setInitialZapiCredentialMode(undefined);
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
        connectionAllowance={connectionAllowance}
        connections={connections}
        {...(marketplaceApi ? { marketplaceApi } : {})}
        onChoose={chooseProvider}
        onConnectionsChanged={handlers.onRefreshConnections}
        onManageConnection={(candidate) => {
          if (isUiDemoConnection(candidate)) return;
          setManagedConnectionId(String(candidate.id));
        }}
        onRepairConnection={(candidate) => {
          if (isUiDemoConnection(candidate)) return;
          chooseConnectionForRepair(candidate);
        }}
        onRedirect={onRedirect}
        showRepairActions={canRepairCredentials && isCrmEntitled}
        showSetupActions={setupAllowed}
        showZapiSetupActions={setupAllowed && isCrmEntitled}
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
        {...(provider === "zapi" || provider === "uazapi"
          ? { hideHeading: true }
          : {})}
        title={
          provider === "zapi"
            ? "Conectar WhatsApp · Z-API"
            : provider === "uazapi"
              ? "Conectar WhatsApp · UAZAPI"
              : officialChannel === "instagram"
                ? "Configurar Instagram Oficial"
                : "Configurar WhatsApp Oficial"
        }
      >
        {provider === "zapi" ? (
          <CrmWhatsappZapiSetup
            canPair={canPair}
            canRepairCredentials={canRepairCredentials}
            canSetup={setupAllowed}
            connection={connection?.provider === "zapi" ? connection : null}
            handlers={handlers}
            {...(initialZapiCredentialMode
              ? { initialCredentialMode: initialZapiCredentialMode }
              : {})}
            onBack={closeSetup}
            onConnection={setConnection}
          />
        ) : provider === "uazapi" ? (
          <CrmWhatsappUazapiSetup
            canPair={canPair}
            canSetup={setupAllowed}
            connection={connection?.provider === "uazapi" ? connection : null}
            handlers={handlers}
            onBack={closeSetup}
            onConnection={setConnection}
          />
        ) : isOfficialSetupProvider(provider) ? (
          <CrmOfficialChannelSetup
            completion={completion}
            canSetup={setupAllowed}
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
        {...(handlers.onListConnectionMembers
          ? { onListConnectionMembers: handlers.onListConnectionMembers }
          : {})}
        {...(handlers.onGrantConnectionMember
          ? { onGrantConnectionMember: handlers.onGrantConnectionMember }
          : {})}
        {...(handlers.onRevokeConnectionMember
          ? { onRevokeConnectionMember: handlers.onRevokeConnectionMember }
          : {})}
        {...(managedConnection?.provider === "zapi" &&
        canRepairCredentials &&
        needsConnectionRepair(managedConnection)
          ? {
              onRepair: () => {
                setManagedConnectionId(null);
                chooseConnectionForRepair(managedConnection);
              },
            }
          : {})}
        {...(managedConnection?.provider === "zapi" &&
        canRepairCredentials &&
        handlers.onReplaceZapiConnection
          ? {
              onReplace: () => {
                setManagedConnectionId(null);
                chooseConnectionForReplacement(managedConnection);
              },
            }
          : {})}
        {...(managedConnection?.provider === "zapi" &&
        handlers.onRefreshZapiStatus
          ? {
              onRefreshStatus: async () => {
                await handlers.onRefreshZapiStatus!(managedConnection.id);
              },
            }
          : {})}
        {...(managedConnection?.provider === "uazapi" &&
        handlers.onRefreshUazapiStatus
          ? {
              onRefreshStatus: async () => {
                await handlers.onRefreshUazapiStatus!(managedConnection.id);
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
  if (provider === "zapi") return connection.provider === "zapi";
  if (provider === "uazapi") return connection.provider === "uazapi";
  return isComposioConnectionForProvider(connection, channel);
}

function readSetupProvider(
  connection: CrmProviderConnection | null | undefined,
): CrmSetupProvider | null {
  if (!connection) return null;
  if (connection.provider === "zapi") return "zapi";
  if (connection.provider === "uazapi") return "uazapi";
  if (connection.provider === "meta_cloud") return "meta_cloud";
  return null;
}
