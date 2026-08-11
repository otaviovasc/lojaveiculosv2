import { lazy, Suspense, useEffect, useMemo, useState } from "react";
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

const CrmWhatsappSelfServiceSetup = lazy(() =>
  import("./CrmWhatsappSelfServiceSetup").then((module) => ({
    default: module.CrmWhatsappSelfServiceSetup,
  })),
);

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

  useEffect(() => {
    setLocalError(null);
  }, [selected]);

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
      <Suspense
        fallback={
          <p className="crm-whatsapp-connection-empty" role="status">
            Carregando configuração do canal.
          </p>
        }
      >
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
            {selected.live.providerStatus === "connected" ? (
              <ConnectionDashboard {...sharedConnectionProps} />
            ) : selfService &&
              (selected.provider === "composio_whatsapp" ||
                selected.provider === "zapi") ? (
              <CrmWhatsappSelfServiceSetup
                allowance={selfService.allowance}
                availableProviders={selfService.availableProviders}
                canPair={selfService.canPair}
                canSetup={selfService.canSetup}
                existingConnection={selected}
                handlers={selfService.handlers}
                {...(selfService.zapiAddonContract !== undefined
                  ? { zapiAddonContract: selfService.zapiAddonContract }
                  : {})}
              />
            ) : (
              <ConnectionSetupFlow
                {...sharedConnectionProps}
                localError={localError}
              />
            )}
          </>
        ) : selfService ? (
          <CrmWhatsappSelfServiceSetup
            allowance={selfService.allowance}
            availableProviders={selfService.availableProviders}
            canPair={selfService.canPair}
            canSetup={selfService.canSetup}
            handlers={selfService.handlers}
            {...(selfService.zapiAddonContract !== undefined
              ? { zapiAddonContract: selfService.zapiAddonContract }
              : {})}
          />
        ) : (
          <p className="crm-whatsapp-connection-empty">
            Nenhuma conexão de mensagens configurada para esta loja.
          </p>
        )}
      </Suspense>
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
