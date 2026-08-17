import { lazy, Suspense, type ReactNode } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  ConnectionDashboard,
  ConnectionSetupFlow,
} from "./CrmWhatsappConnectionViews";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";
import type {
  CrmWhatsappConnectionAllowance,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";
import { readPendingComposioConnectionId } from "./crmWhatsappComposioOAuth";
import { CrmChannelRoutingPanel } from "./CrmChannelRoutingPanel";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { isConnectedConnection } from "./crmWhatsappConnectionSelection";
import {
  readCrmWhatsappChannelLabel,
  readCrmWhatsappProviderLabel,
} from "./crmWhatsappConnectionStatus";

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
  const pendingConnectionId = readInitialConnectionId(connections);
  const selected =
    connections.find(
      (connection) => String(connection.id) === pendingConnectionId,
    ) ??
    connections.find(
      (connection) => connection.isDefault && isConnectedConnection(connection),
    ) ??
    (connections.length === 1 ? connections[0] : null) ??
    null;

  if (isLoading) {
    return (
      <p className="crm-whatsapp-connection-empty" role="status">
        Carregando conexão de mensagens.
      </p>
    );
  }

  return (
    <section aria-label="Conexão" className="crm-whatsapp-connection-admin">
      {error ? (
        <p className="crm-whatsapp-connection-error" role="alert">
          {formatApiErrorDisplay(error, "Não foi possível carregar a conexão.")}
        </p>
      ) : null}
      {connections.length > 0 ? (
        <section
          aria-label="Canais conectados"
          className="crm-channel-directory"
        >
          <header>
            <h2>Canais conectados</h2>
            <p>Rotas de comunicação do CRM, agrupadas por canal.</p>
          </header>
          <div className="crm-channel-directory-list">
            {connections.map((connection) => {
              const ready = isConnectedConnection(connection);
              return (
                <article key={connection.id}>
                  <div>
                    <strong>
                      {readCrmWhatsappChannelLabel(connection.channel ?? "")}
                    </strong>
                    <span>
                      {readCrmWhatsappProviderLabel(connection.provider)} ·{" "}
                      {connection.displayName}
                    </span>
                  </div>
                  <span role="status">
                    {ready
                      ? "Pronto"
                      : (connection.readiness?.reason ?? "Requer configuração")}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {selfService ? (
        <ConnectionSetupBoundary>
          <CrmWhatsappSelfServiceSetup
            allowance={selfService.allowance}
            availableProviders={selfService.availableProviders}
            canPair={selfService.canPair}
            canSetup={selfService.canSetup}
            connections={connections}
            existingConnection={selected}
            handlers={selfService.handlers}
            startAtDirectory={!readPendingComposioConnectionId()}
            {...(selfService.zapiAddonContract !== undefined
              ? { zapiAddonContract: selfService.zapiAddonContract }
              : {})}
          />
        </ConnectionSetupBoundary>
      ) : selected ? (
        selected.live.providerStatus === "connected" ? (
          <ConnectionDashboard
            connection={selected}
            disabled={disabled}
            isRefreshing={false}
            onRefresh={() => void onRefresh()}
          />
        ) : (
          <ConnectionSetupFlow
            connection={selected}
            disabled={disabled}
            isRefreshing={false}
            localError={null}
            onRefresh={() => void onRefresh()}
          />
        )
      ) : (
        <p className="crm-whatsapp-connection-empty">
          Nenhuma conexão de mensagens configurada para esta loja.
        </p>
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

function readInitialConnectionId(connections: CrmWhatsappProviderConnection[]) {
  const pendingId = readPendingComposioConnectionId();
  if (
    pendingId &&
    connections.some((connection) => String(connection.id) === pendingId)
  ) {
    return pendingId;
  }
  return null;
}
