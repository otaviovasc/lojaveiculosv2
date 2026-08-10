import { useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmSelect } from "./CrmFormControls";
import {
  ConnectionDashboard,
  ConnectionSetupFlow,
} from "./CrmWhatsappConnectionViews";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import {
  CrmWhatsappSelfServiceSetup,
  type CrmWhatsappSelfServiceHandlers,
} from "./CrmWhatsappSelfServiceSetup";
import type {
  CrmWhatsappConnectionAllowance,
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappUpdateConnectionInput,
} from "./crmWhatsappTypes";
import { readPendingComposioConnectionId } from "./crmWhatsappComposioOAuth";

type ConnectionAdminProps = {
  connections: CrmWhatsappProviderConnection[];
  disabled?: boolean;
  embedded?: boolean;
  error?: Error | null;
  isLoading?: boolean;
  onClose?: () => void;
  onConfigureWebhooks: (
    connectionId: CrmWhatsappProviderConnection["id"],
  ) => Promise<CrmWhatsappConfigureWebhooksResult | null>;
  onRefresh: () => Promise<void>;
  onUpdate: (
    connectionId: CrmWhatsappProviderConnection["id"],
    input: CrmWhatsappUpdateConnectionInput,
  ) => Promise<boolean>;
  selfService?: {
    allowance: CrmWhatsappConnectionAllowance;
    availableProviders: CrmWhatsappSetupProvider[];
    canManage: boolean;
    handlers: CrmWhatsappSelfServiceHandlers;
  };
};

export function CrmWhatsappConnectionAdmin(props: ConnectionAdminProps) {
  const {
    connections,
    disabled = false,
    error,
    isLoading = false,
    onConfigureWebhooks,
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
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configResult, setConfigResult] =
    useState<CrmWhatsappConfigureWebhooksResult | null>(null);

  useEffect(() => {
    setLocalError(null);
    setConfigResult(null);
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

  const configureAutomatically = async () => {
    if (!selected || selected.provider !== "zapi") return;
    setIsConfiguring(true);
    setLocalError(null);
    try {
      const result = await onConfigureWebhooks(selected.id);
      setConfigResult(result);
      if (!result) {
        setLocalError(
          "Não foi possível concluir a configuração automática. Tente novamente ou fale com o suporte.",
        );
      }
    } catch {
      setLocalError(
        "Não foi possível concluir a configuração automática. Tente novamente ou fale com o suporte.",
      );
    } finally {
      setIsConfiguring(false);
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
        isConfiguringWebhooks: isConfiguring,
        isRefreshing,
        onConfigureWebhooks: () => void configureAutomatically(),
        onRefresh: () => void refresh(),
        webhookConfigResult: configResult,
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
          {selected.live.providerStatus === "connected" ? (
            <ConnectionDashboard {...sharedConnectionProps} />
          ) : selfService && selected.provider === "composio_whatsapp" ? (
            <CrmWhatsappSelfServiceSetup
              allowance={selfService.allowance}
              availableProviders={selfService.availableProviders}
              canManage={selfService.canManage}
              existingConnection={selected}
              handlers={selfService.handlers}
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
          canManage={selfService.canManage}
          handlers={selfService.handlers}
        />
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
