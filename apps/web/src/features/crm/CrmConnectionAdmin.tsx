import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  CrmConnectionAllowance,
  CrmExternalBotProfile,
} from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";
import type {
  CrmAvailableSetup,
  CrmProviderConnection,
} from "./crmConversationTypes";
import {
  isComposioConnectionForProvider,
  readPendingComposioConnection,
  readPendingComposioConnectionId,
} from "./crmComposioOAuth";
import { CrmChannelRoutingPanel } from "./CrmChannelRoutingPanel";
import type { CrmConversationApi } from "./crmConversationApi";
import { CrmSelect } from "./CrmFormControls";
import { CrmChannelDirectory } from "./CrmChannelDirectory";
import { CrmConnectionManageDialog } from "./CrmConnectionAdminDialog";

const CrmConnectionSelfServiceSetup = lazy(async () => {
  const module = await import("./CrmConnectionSelfServiceSetup");
  return { default: module.CrmConnectionSelfServiceSetup };
});

function ConnectionSetupBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p className="crm-connection-empty" role="status">
          Carregando opções de conexão.
        </p>
      }
    >
      {children}
    </Suspense>
  );
}

type ConnectionAdminProps = {
  connections: CrmProviderConnection[];
  disabled?: boolean;
  embedded?: boolean;
  error?: Error | null;
  isLoading?: boolean;
  onClose?: () => void;
  onRefresh: () => Promise<void>;
  onRoutingPolicyChange?: () => Promise<void> | void;
  routingApi?: Pick<
    CrmConversationApi,
    "getRoutingPolicy" | "updateRoutingPolicy"
  >;
  botProfileApi?: Pick<
    CrmConversationApi,
    "assignBotProfile" | "listBotProfileAssignments" | "listBotProfiles"
  >;
  canManageBotProfiles?: boolean;
  canManageRouting?: boolean;
  selfService?: {
    availableSetups: readonly CrmAvailableSetup[];
    canPair: boolean;
    canRepairCredentials?: boolean;
    canSetup: boolean;
    connectionAllowance?: CrmConnectionAllowance | null;
    handlers: CrmConnectionSelfServiceHandlers;
    isCrmEntitled: boolean;
  };
};

export function CrmConnectionAdmin(props: ConnectionAdminProps) {
  const {
    connections,
    disabled = false,
    error,
    isLoading = false,
    onRefresh,
    onRoutingPolicyChange,
    routingApi,
    botProfileApi,
    canManageBotProfiles = false,
    canManageRouting = false,
    selfService,
  } = props;
  const [managedConnectionId, setManagedConnectionId] = useState<string | null>(
    null,
  );
  const managedConnection = managedConnectionId
    ? (connections.find(
        (connection) => String(connection.id) === managedConnectionId,
      ) ?? null)
    : null;
  const [botProfiles, setBotProfiles] = useState<CrmExternalBotProfile[]>([]);
  const [botAssignments, setBotAssignments] = useState<
    Record<string, string | null>
  >({});
  const [botProfileError, setBotProfileError] = useState<string | null>(null);
  const [savingBotConnectionId, setSavingBotConnectionId] = useState<
    string | null
  >(null);

  const loadBotAssignments = useCallback(async () => {
    if (!botProfileApi) return;
    try {
      const [profileResult, assignmentResult] = await Promise.all([
        botProfileApi.listBotProfiles(),
        botProfileApi.listBotProfileAssignments(),
      ]);
      setBotProfiles(profileResult.profiles);
      setBotAssignments(
        Object.fromEntries(
          assignmentResult.map((assignment) => [
            assignment.connectionId,
            assignment.profileId,
          ]),
        ),
      );
      setBotProfileError(null);
    } catch {
      setBotProfileError("Não foi possível carregar os perfis de bot.");
    }
  }, [botProfileApi]);

  useEffect(() => {
    void loadBotAssignments();
  }, [loadBotAssignments]);

  const assignBotProfile = async (
    connectionId: string,
    profileId: string | null,
  ) => {
    if (!botProfileApi || !canManageBotProfiles) return;
    setSavingBotConnectionId(connectionId);
    try {
      await botProfileApi.assignBotProfile(connectionId, profileId);
      setBotAssignments((current) => ({
        ...current,
        [connectionId]: profileId,
      }));
      setBotProfileError(null);
    } catch {
      setBotProfileError("Não foi possível salvar o perfil desta conexão.");
    } finally {
      setSavingBotConnectionId(null);
    }
  };

  if (isLoading) {
    return (
      <p className="crm-connection-empty" role="status">
        Carregando conexão de mensagens.
      </p>
    );
  }

  return (
    <section aria-label="Conexões" className="crm-connection-admin">
      {error ? (
        <p className="crm-connection-error" role="alert">
          {formatApiErrorDisplay(error, "Não foi possível carregar a conexão.")}
        </p>
      ) : null}
      {selfService ? (
        <ConnectionSetupBoundary>
          <CrmConnectionSelfServiceSetup
            availableSetups={selfService.availableSetups}
            canPair={selfService.canPair}
            canRepairCredentials={selfService.canRepairCredentials ?? false}
            canSetup={selfService.canSetup}
            connectionAllowance={selfService.connectionAllowance ?? null}
            connections={connections}
            existingConnection={readInitialConnection(connections)}
            handlers={selfService.handlers}
            isCrmEntitled={selfService.isCrmEntitled}
            startAtDirectory={!readPendingComposioConnectionId()}
          />
        </ConnectionSetupBoundary>
      ) : (
        <>
          {connections.length ? (
            <CrmChannelDirectory
              availableSetups={[]}
              connections={connections}
              onChoose={() => undefined}
              onConnectionsChanged={onRefresh}
              onManageConnection={(connection) =>
                setManagedConnectionId(String(connection.id))
              }
              showRepairActions={false}
              showSetupActions={false}
            />
          ) : (
            <p className="crm-connection-empty">
              Nenhuma conexão de mensagens configurada para esta loja.
            </p>
          )}
          <CrmConnectionManageDialog
            connection={managedConnection}
            disabled={disabled}
            onClose={() => setManagedConnectionId(null)}
            onRefresh={onRefresh}
          />
        </>
      )}
      {routingApi ? (
        <CrmChannelRoutingPanel
          api={routingApi}
          canManage={canManageRouting}
          connections={connections}
          {...(onRoutingPolicyChange
            ? { onPolicyChange: onRoutingPolicyChange }
            : {})}
        />
      ) : null}
      {botProfileApi ? (
        <section
          aria-label="Perfis de bot por conexão"
          className="crm-connection-bot-profiles"
        >
          <div className="crm-section-heading">
            <div>
              <strong>Bot externo por conexão</strong>
              <p>Escolha qual perfil atende cada número conectado.</p>
            </div>
          </div>
          {botProfileError ? (
            <p className="crm-connection-error" role="alert">
              {botProfileError}
            </p>
          ) : null}
          {connections.length ? (
            <div className="crm-connection-bot-profile-list">
              {connections.map((connection) => {
                const connectionId = String(connection.id);
                return (
                  <label
                    className="crm-connection-bot-profile-row"
                    key={connectionId}
                  >
                    <span>
                      <strong>{connection.displayName}</strong>
                      <small>
                        {connection.phoneNumber ??
                          connection.phone ??
                          connection.channel ??
                          "Conexão"}
                      </small>
                    </span>
                    <CrmSelect
                      aria-label={`Perfil de bot para ${connection.displayName}`}
                      className="crm-bot-input"
                      disabled={
                        !canManageBotProfiles ||
                        savingBotConnectionId === connectionId
                      }
                      onChange={(value) =>
                        void assignBotProfile(connectionId, value || null)
                      }
                      options={[
                        { label: "Sem bot externo", value: "" },
                        ...botProfiles.map((profile) => ({
                          disabled: !profile.enabled,
                          label: `${profile.name}${profile.isDefault ? " (padrão)" : ""}${!profile.enabled ? " (inativo)" : ""}`,
                          value: profile.id,
                        })),
                      ]}
                      placeholder="Selecionar perfil"
                      value={botAssignments[connectionId] ?? ""}
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="crm-connection-empty">
              Configure uma conexão antes de atribuir um bot.
            </p>
          )}
        </section>
      ) : null}
    </section>
  );
}

function readInitialConnection(
  connections: CrmProviderConnection[],
): CrmProviderConnection | null {
  const pending = readPendingComposioConnection();
  if (!pending) return null;
  return (
    connections.find(
      (connection) =>
        String(connection.id) === pending.connectionId &&
        isComposioConnectionForProvider(connection, pending.channel),
    ) ?? null
  );
}
