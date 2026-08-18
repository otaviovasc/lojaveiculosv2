import { useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { isConnectedConnection } from "./crmWhatsappConnectionSelection";
import { readCrmWhatsappChannelLabel } from "./crmWhatsappConnectionStatus";
import {
  ConnectionDashboard,
  ConnectionSetupFlow,
} from "./CrmWhatsappConnectionViews";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

/**
 * One coherent modal shell for connection status, details, reconnect,
 * pause/resume and disconnect-adjacent management. Provider-specific setup
 * stays inside the setup dialog owned by CrmWhatsappSelfServiceSetup.
 */
export function CrmConnectionManageDialog({
  canManage = false,
  connection,
  disabled = false,
  isRefreshing = false,
  onClose,
  onRefresh,
  onSetConnectionPaused,
}: {
  canManage?: boolean;
  connection: CrmWhatsappProviderConnection | null;
  disabled?: boolean;
  isRefreshing?: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onSetConnectionPaused?: (
    connectionId: CrmWhatsappConnectionId,
    paused: boolean,
  ) => Promise<void>;
}) {
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const togglePaused = async () => {
    if (!connection || !onSetConnectionPaused || lifecycleBusy) return;
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      await onSetConnectionPaused(
        connection.id,
        connection.status !== "paused",
      );
    } catch (caught) {
      setLifecycleError(
        formatApiErrorDisplay(
          caught,
          connection.status === "paused"
            ? "Não foi possível retomar o canal."
            : "Não foi possível pausar o canal.",
        ),
      );
    } finally {
      setLifecycleBusy(false);
    }
  };

  const title = connection
    ? `${readCrmWhatsappChannelLabel(connection.channel ?? "")} · ${connection.displayName}`
    : "Conexão";

  return (
    <FeatureDialog
      className="feature-dialog--medium crm-connection-dialog"
      description={
        connection
          ? "Gerencie o estado do canal sem sair da visão de conexões."
          : undefined
      }
      isOpen={connection !== null}
      onClose={onClose}
      title={title}
    >
      {connection ? (
        <div className="crm-connection-dialog-body">
          {isConnectedConnection(connection) ? (
            <ConnectionDashboard
              connection={connection}
              disabled={disabled}
              isRefreshing={isRefreshing}
              onRefresh={() => void onRefresh()}
            />
          ) : (
            <ConnectionSetupFlow
              connection={connection}
              disabled={disabled}
              isRefreshing={isRefreshing}
              localError={null}
              onRefresh={() => void onRefresh()}
            />
          )}
          {onSetConnectionPaused ? (
            <div className="crm-whatsapp-connection-management-actions">
              <button
                className="crm-action crm-action-muted"
                disabled={!canManage || disabled || lifecycleBusy}
                onClick={() => void togglePaused()}
                type="button"
              >
                {connection.status === "paused" ? (
                  <PlayCircle aria-hidden="true" />
                ) : (
                  <PauseCircle aria-hidden="true" />
                )}
                {lifecycleBusy
                  ? "Atualizando canal"
                  : connection.status === "paused"
                    ? "Retomar canal"
                    : "Pausar no CRM"}
              </button>
              {lifecycleError ? (
                <p className="crm-whatsapp-connection-error" role="alert">
                  {lifecycleError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </FeatureDialog>
  );
}
