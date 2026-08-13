import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmSelect } from "./CrmFormControls";
import {
  ConnectionDashboard,
  ConnectionSetupFlow,
} from "./CrmWhatsappConnectionViews";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";
import type {
  CrmWhatsappConnectionAllowance,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";
import { readPendingComposioConnectionId } from "./crmWhatsappComposioOAuth";

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
    selfService,
  } = props;
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    readInitialConnectionId(connections),
  );
  const selected = useMemo(
    () =>
      connections.find((connection) => String(connection.id) === selectedId) ??
      connections[0] ??
      null,
    [connections, selectedId],
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [managementView, setManagementView] = useState<
    "directory" | "manage" | "overview"
  >("overview");

  useEffect(() => {
    setLocalError(null);
    setManagementView("overview");
  }, [selectedId]);

  useEffect(() => {
    if (
      selectedId &&
      connections.some((item) => String(item.id) === selectedId)
    ) {
      return;
    }
    setSelectedId(connections[0]?.id ? String(connections[0].id) : null);
  }, [connections, selectedId]);

  const refresh = async () => {
    setIsRefreshing(true);
    setLocalError(null);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const setPaused = async (paused: boolean) => {
    if (!selected || !selfService?.handlers.onSetConnectionPaused) return;
    setIsRefreshing(true);
    setLocalError(null);
    try {
      await selfService.handlers.onSetConnectionPaused(selected.id, paused);
    } catch (caught) {
      setLocalError(
        formatApiErrorDisplay(
          caught,
          paused
            ? "Não foi possível pausar o canal."
            : "Não foi possível retomar o canal.",
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <p className="crm-whatsapp-connection-empty" role="status">
        Carregando conexão de mensagens.
      </p>
    );
  }

  const sharedConnectionProps = selected
    ? {
        connection: selected,
        disabled,
        isRefreshing,
        onRefresh: () => void refresh(),
      }
    : null;

  return (
    <section aria-label="Conexão" className="crm-whatsapp-connection-admin">
      {error ? (
        <p className="crm-whatsapp-connection-error" role="alert">
          {formatApiErrorDisplay(error, "Não foi possível carregar a conexão.")}
        </p>
      ) : null}
      {selected && sharedConnectionProps ? (
        <>
          {connections.length > 1 ? (
            <label className="crm-whatsapp-connection-selector">
              Canal
              <CrmSelect
                className="crm-whatsapp-select"
                onChange={setSelectedId}
                options={connections.map((connection) => ({
                  label: `${connection.displayName} · ${readCrmWhatsappProviderLabel(connection.provider)}`,
                  value: String(connection.id),
                }))}
                value={String(selected.id)}
              />
            </label>
          ) : null}
          {selfService && managementView !== "overview" ? (
            <ConnectionSetupBoundary>
              <CrmWhatsappSelfServiceSetup
                allowance={selfService.allowance}
                availableProviders={selfService.availableProviders}
                canPair={selfService.canPair}
                canSetup={selfService.canSetup}
                connections={connections}
                existingConnection={selected}
                handlers={selfService.handlers}
                startAtDirectory={managementView === "directory"}
                {...(selfService.zapiAddonContract !== undefined
                  ? { zapiAddonContract: selfService.zapiAddonContract }
                  : {})}
              />
            </ConnectionSetupBoundary>
          ) : selected.live.providerStatus === "connected" ||
            selected.status === "paused" ? (
            <>
              <ConnectionDashboard {...sharedConnectionProps} />
              {selfService ? (
                <div className="crm-whatsapp-connection-management-actions">
                  {selected.provider === "zapi" ||
                  selected.provider === "composio_whatsapp" ? (
                    <button
                      className="crm-action crm-action-secondary"
                      onClick={() => setManagementView("manage")}
                      type="button"
                    >
                      Gerenciar{" "}
                      {readCrmWhatsappProviderLabel(selected.provider)}
                    </button>
                  ) : null}
                  {selfService.handlers.onSetConnectionPaused ? (
                    <button
                      className="crm-action crm-action-muted"
                      disabled={!selfService.canSetup || isRefreshing}
                      onClick={() =>
                        void setPaused(selected.status !== "paused")
                      }
                      type="button"
                    >
                      {selected.status === "paused"
                        ? "Retomar canal"
                        : "Pausar no CRM"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {localError ? (
                <p className="crm-whatsapp-connection-error" role="alert">
                  {localError}
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
                    existingConnection={selected}
                    handlers={selfService.handlers}
                    startAtDirectory
                    {...(selfService.zapiAddonContract !== undefined
                      ? { zapiAddonContract: selfService.zapiAddonContract }
                      : {})}
                  />
                </ConnectionSetupBoundary>
              ) : null}
            </>
          ) : selfService &&
            (selected.provider === "composio_whatsapp" ||
              selected.provider === "zapi") ? (
            <ConnectionSetupBoundary>
              <CrmWhatsappSelfServiceSetup
                allowance={selfService.allowance}
                availableProviders={selfService.availableProviders}
                canPair={selfService.canPair}
                canSetup={selfService.canSetup}
                connections={connections}
                existingConnection={selected}
                handlers={selfService.handlers}
                {...(selfService.zapiAddonContract !== undefined
                  ? { zapiAddonContract: selfService.zapiAddonContract }
                  : {})}
              />
            </ConnectionSetupBoundary>
          ) : (
            <ConnectionSetupFlow
              {...sharedConnectionProps}
              localError={localError}
            />
          )}
        </>
      ) : selfService ? (
        <ConnectionSetupBoundary>
          <CrmWhatsappSelfServiceSetup
            allowance={selfService.allowance}
            availableProviders={selfService.availableProviders}
            canPair={selfService.canPair}
            canSetup={selfService.canSetup}
            connections={connections}
            handlers={selfService.handlers}
            {...(selfService.zapiAddonContract !== undefined
              ? { zapiAddonContract: selfService.zapiAddonContract }
              : {})}
          />
        </ConnectionSetupBoundary>
      ) : (
        <p className="crm-whatsapp-connection-empty">
          Nenhuma conexão de mensagens configurada para esta loja.
        </p>
      )}
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
  return connections[0]?.id ? String(connections[0].id) : null;
}
