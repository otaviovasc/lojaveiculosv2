import { lazy, Suspense, useState, type ReactNode } from "react";
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
  canManageRouting?: boolean;
  selfService?: {
    availableSetups: readonly CrmAvailableSetup[];
    canPair: boolean;
    canRepairCredentials?: boolean;
    canSetup: boolean;
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
