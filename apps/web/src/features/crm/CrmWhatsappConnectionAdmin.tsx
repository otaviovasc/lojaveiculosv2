import { lazy, Suspense, useState, type ReactNode } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";
import type {
  CrmWhatsappConnectionAllowance,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";
import {
  isComposioConnectionForProvider,
  readPendingComposioConnection,
  readPendingComposioConnectionId,
} from "./crmWhatsappComposioOAuth";
import { CrmChannelRoutingPanel } from "./CrmChannelRoutingPanel";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappChannelDirectory } from "./CrmWhatsappChannelDirectory";
import { CrmConnectionManageDialog } from "./CrmWhatsappConnectionAdminDialog";

const CrmWhatsappSelfServiceSetup = lazy(async () => {
  const module = await import("./CrmWhatsappSelfServiceSetup");
  return { default: module.CrmWhatsappSelfServiceSetup };
});

function ConnectionSetupBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p className="crm-whatsapp-connection-empty" role="status">
          Carregando opções de conexão.
        </p>
      }
    >
      {children}
    </Suspense>
  );
}

type ConnectionAdminProps = {
  connections: CrmWhatsappProviderConnection[];
  disabled?: boolean;
  embedded?: boolean;
  error?: Error | null;
  isLoading?: boolean;
  onClose?: () => void;
  onRefresh: () => Promise<void>;
  onRoutingPolicyChange?: () => Promise<void> | void;
  routingApi?: Pick<CrmWhatsappApi, "getRoutingPolicy" | "updateRoutingPolicy">;
  canManageRouting?: boolean;
  selfService?: {
    allowance: CrmWhatsappConnectionAllowance;
    availableProviders: CrmWhatsappSetupProvider[];
    canPair: boolean;
    canSetup: boolean;
    handlers: CrmWhatsappSelfServiceHandlers;
    zapiAddonContract?: CrmWhatsappZapiAddonContract | null;
  };
};

export function CrmWhatsappConnectionAdmin(props: ConnectionAdminProps) {
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
      <p className="crm-whatsapp-connection-empty" role="status">
        Carregando conexão de mensagens.
      </p>
    );
  }

  return (
    <section aria-label="Conexões" className="crm-whatsapp-connection-admin">
      {error ? (
        <p className="crm-whatsapp-connection-error" role="alert">
          {formatApiErrorDisplay(error, "Não foi possível carregar a conexão.")}
        </p>
      ) : null}
      {selfService ? (
        <ConnectionSetupBoundary>
          <CrmWhatsappSelfServiceSetup
            allowance={selfService.allowance}
            availableProviders={selfService.availableProviders}
            canPair={selfService.canPair}
            canSetup={selfService.canSetup}
            connections={connections}
            existingConnection={readInitialConnection(connections)}
            handlers={selfService.handlers}
            startAtDirectory={!readPendingComposioConnectionId()}
            {...(selfService.zapiAddonContract !== undefined
              ? { zapiAddonContract: selfService.zapiAddonContract }
              : {})}
          />
        </ConnectionSetupBoundary>
      ) : (
        <>
          {connections.length ? (
            <CrmWhatsappChannelDirectory
              availableProviders={[]}
              connections={connections}
              onChoose={() => undefined}
              onConnectionsChanged={onRefresh}
              onManageConnection={(connection) =>
                setManagedConnectionId(String(connection.id))
              }
              showSetupActions={false}
              zapiAddonContract={null}
            />
          ) : (
            <p className="crm-whatsapp-connection-empty">
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
  connections: CrmWhatsappProviderConnection[],
): CrmWhatsappProviderConnection | null {
  const pending = readPendingComposioConnection();
  if (!pending) return null;
  return (
    connections.find(
      (connection) =>
        String(connection.id) === pending.connectionId &&
        isComposioConnectionForProvider(connection, pending.provider),
    ) ?? null
  );
}
