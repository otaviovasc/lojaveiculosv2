import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";

export function ConnectionSectionCard({
  children,
  className = "",
  description,
  icon,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className={`crm-whatsapp-connection-card ${className}`.trim()}>
      <header>
        {icon ? <span>{icon}</span> : null}
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function ConnectionStatusCard({
  connection,
  disabled = false,
  isRefreshing,
  onRefresh,
  showRefresh = true,
}: {
  connection: CrmWhatsappProviderConnection;
  disabled?: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  showRefresh?: boolean;
}) {
  const statusTone = readProviderStatusTone(connection);
  return (
    <section
      className="crm-whatsapp-connection-status-card"
      data-status={statusTone}
    >
      <span className="crm-whatsapp-connection-status-icon">
        <AnimatedIconSwap stateKey={statusTone} variant="scale-fade">
          {statusTone === "connected" ? (
            <Wifi aria-hidden="true" />
          ) : statusTone === "error" ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <WifiOff aria-hidden="true" />
          )}
        </AnimatedIconSwap>
      </span>
      <div>
        <span>{readCrmWhatsappProviderLabel(connection.provider)}</span>
        <strong>{readProviderStatus(connection)}</strong>
        <small>{readConnectionStatusDetail(connection)}</small>
      </div>
      <span className="crm-whatsapp-connection-status-badge">
        {readProviderStatusBadge(connection)}
      </span>
      {showRefresh ? (
        <button
          aria-label="Atualizar status da conexão"
          className="crm-icon-action"
          disabled={disabled || isRefreshing}
          onClick={onRefresh}
          title="Atualizar status"
          type="button"
        >
          <AnimatedIconSwap stateKey={isRefreshing} variant="rotate-spin">
            <RefreshCw
              aria-hidden="true"
              className={isRefreshing ? "animate-spin" : ""}
            />
          </AnimatedIconSwap>
        </button>
      ) : null}
    </section>
  );
}

export function readProviderStatus(connection: CrmWhatsappProviderConnection) {
  const provider = readCrmWhatsappProviderLabel(connection.provider);
  if (connection.live.providerStatus === "error") return `${provider}: erro`;
  if (connection.live.providerStatus === "connected")
    return `${provider}: online`;
  if (connection.live.providerStatus === "disconnected") return "Desconectada";
  return "Status desconhecido";
}

function readProviderStatusBadge(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "connected") return "Online";
  if (connection.live.providerStatus === "error") return "Erro";
  if (connection.live.providerStatus === "disconnected") return "Offline";
  return "Pendente";
}

function readProviderStatusTone(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "connected") return "connected";
  if (connection.live.providerStatus === "error") return "error";
  if (connection.live.providerStatus === "disconnected") return "disconnected";
  return "unknown";
}

function readConnectionStatusDetail(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "error") {
    return connection.provider === "zapi"
      ? "Não foi possível confirmar a conexão. Tente novamente ou fale com o suporte."
      : "Não foi possível confirmar o canal. Nenhuma operação oficial foi confirmada.";
  }
  if (connection.live.providerStatus === "connected") {
    if (connection.provider === "composio_instagram") {
      return "Conta profissional conectada com segurança";
    }
    const phone =
      connection.live.connectedPhone ??
      connection.metadata?.connectedPhone ??
      connection.phone;
    if (phone) return `Conectado - ${phone}`;
    return connection.provider === "composio_whatsapp"
      ? "Conta oficial conectada com segurança"
      : "Conectado sem telefone informado";
  }
  if (connection.live.providerStatus === "disconnected") {
    if (connection.provider !== "zapi") {
      return "Canal oficial desconectado. Nenhuma operacao oficial esta disponivel.";
    }
    return "Aguardando configuração ou reconexão pela equipe de suporte.";
  }
  if (connection.provider !== "zapi") {
    return "Status oficial ainda nao verificado. Nenhuma operacao oficial foi confirmada.";
  }
  return (
    connection.live.connectedPhone ??
    connection.metadata?.connectedPhone ??
    connection.phone ??
    "Status ainda nao verificado"
  );
}
