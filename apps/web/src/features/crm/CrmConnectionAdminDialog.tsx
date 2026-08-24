import { useState } from "react";
import { ArrowRightLeft, PauseCircle, PlayCircle, Wrench } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { isConnectedConnection } from "./crmConnectionSelection";
import { readCrmChannelLabel } from "./crmConnectionStatus";
import { ConnectionDashboard, ConnectionSetupFlow } from "./CrmConnectionViews";
import type {
  CrmConnectionId,
  CrmProviderConnection,
} from "./crmConversationTypes";

/**
 * One coherent modal shell for connection status, details, reconnect,
 * pause/resume and disconnect-adjacent management. Provider-specific setup
 * stays inside the setup dialog owned by CrmConnectionSelfServiceSetup.
 */
export function CrmConnectionManageDialog({
  canManage = false,
  connection,
  disabled = false,
  isRefreshing = false,
  onClose,
  onRefresh,
  onRefreshStatus,
  onRepair,
  onReplace,
  onSetConnectionPaused,
}: {
  canManage?: boolean;
  connection: CrmProviderConnection | null;
  disabled?: boolean;
  isRefreshing?: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onRefreshStatus?: () => Promise<void>;
  onRepair?: () => void;
  onReplace?: () => void;
  onSetConnectionPaused?: (
    connectionId: CrmConnectionId,
    paused: boolean,
  ) => Promise<void>;
}) {
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const refreshStatus = async () => {
    if (statusBusy || disabled || isRefreshing) return;
    setStatusBusy(true);
    setLifecycleError(null);
    try {
      await (onRefreshStatus ? onRefreshStatus() : onRefresh());
    } catch (caught) {
      setLifecycleError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível atualizar o status da conexão.",
        ),
      );
    } finally {
      setStatusBusy(false);
    }
  };

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
    ? `${readCrmChannelLabel(connection.channel ?? "")} · ${connection.displayName}`
    : "Conexão";

  return (
    <FeatureDialog
      className="feature-dialog--large crm-connection-dialog"
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
              isRefreshing={isRefreshing || statusBusy}
              onRefresh={() => void refreshStatus()}
            />
          ) : (
            <ConnectionSetupFlow
              connection={connection}
              disabled={disabled}
              isRefreshing={isRefreshing || statusBusy}
              localError={null}
              onRefresh={() => void refreshStatus()}
            />
          )}
          {onRepair ? (
            <div className="crm-connection-management-actions">
              <button
                className="crm-action crm-action-primary"
                disabled={!canManage || disabled || lifecycleBusy}
                onClick={onRepair}
                type="button"
              >
                <Wrench aria-hidden="true" />
                Reparar ou reconectar
              </button>
              <small>
                Reabre o pareamento da conexão existente; o histórico do CRM é
                preservado.
              </small>
            </div>
          ) : null}
          {onReplace ? (
            <div className="crm-connection-management-actions">
              <button
                className="crm-action crm-action-secondary"
                disabled={!canManage || disabled || lifecycleBusy}
                onClick={onReplace}
                type="button"
              >
                <ArrowRightLeft aria-hidden="true" />
                Trocar instância desta loja
              </button>
              <small>
                A conexão atual continua ativa enquanto as novas credenciais são
                verificadas.
              </small>
            </div>
          ) : null}
          {onSetConnectionPaused ? (
            <div className="crm-connection-management-actions">
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
                <p className="crm-connection-error" role="alert">
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
