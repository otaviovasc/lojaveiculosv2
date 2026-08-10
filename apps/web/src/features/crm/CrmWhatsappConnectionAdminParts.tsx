import {
  AlertTriangle,
  Check,
  RefreshCw,
  Webhook,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import type {
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import { crmWhatsappSupportUrl } from "./crmWhatsappSupport";

export type ConnectionWebhookAutoConfigState = {
  disabled?: boolean;
  isConfiguring: boolean;
  onConfigure: () => void;
  result: CrmWhatsappConfigureWebhooksResult | null;
  supportCode?: string | null;
};

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
  isRefreshing,
  onRefresh,
  showRefresh = true,
}: {
  connection: CrmWhatsappProviderConnection;
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
          disabled={isRefreshing}
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

export function ConnectionWebhookAutoConfig({
  disabled = false,
  isConfiguring,
  onConfigure,
  result,
  supportCode,
}: ConnectionWebhookAutoConfigState) {
  const setupFailed =
    result?.setup.status === "failed" || result?.setup.status === "partial";
  const effectiveSupportCode = result?.setup.supportCode ?? supportCode;
  return (
    <div className="crm-whatsapp-webhook-autoconfig">
      <button
        className="crm-whatsapp-connection-save"
        disabled={disabled || isConfiguring}
        onClick={onConfigure}
        type="button"
      >
        <Zap aria-hidden="true" />
        {isConfiguring
          ? "Configurando automaticamente"
          : setupFailed
            ? "Tentar configuração novamente"
            : "Configurar automaticamente"}
      </button>
      {result ? (
        <div
          className="crm-whatsapp-webhook-autoconfig-result"
          data-tone={setupFailed ? "warning" : "success"}
          role="status"
        >
          {result.setup.status === "configured" ? (
            <p className="crm-whatsapp-webhook-autoconfig-ok">
              <Check aria-hidden="true" />
              Conexão preparada automaticamente para receber novas mensagens.
            </p>
          ) : (
            <>
              <p className="crm-whatsapp-webhook-autoconfig-warn">
                <AlertTriangle aria-hidden="true" />
                Não foi possível concluir toda a configuração. Tente novamente
                ou fale com o suporte.
              </p>
              <a
                className="crm-whatsapp-connection-save"
                href={crmWhatsappSupportUrl(effectiveSupportCode)}
                rel="noreferrer"
                target="_blank"
              >
                Falar com o suporte
              </a>
            </>
          )}
        </div>
      ) : (
        <p className="crm-whatsapp-connection-webhook-note">
          O CRM prepara o recebimento de mensagens sem exibir credenciais.
        </p>
      )}
    </div>
  );
}

export function ConnectionWebhookList({
  autoConfig,
  embedded = false,
}: {
  autoConfig?: ConnectionWebhookAutoConfigState;
  embedded?: boolean;
}) {
  const description =
    "Configuração protegida para receber mensagens e atualizações no CRM.";
  const content = (
    <>
      {embedded ? (
        <p className="crm-whatsapp-connection-webhook-note">{description}</p>
      ) : null}
      {autoConfig ? <ConnectionWebhookAutoConfig {...autoConfig} /> : null}
      {!autoConfig ? (
        <p className="crm-whatsapp-connection-empty">
          A configuração automática ainda não está disponível.
        </p>
      ) : null}
    </>
  );

  if (embedded) return content;

  return (
    <ConnectionSectionCard
      className="crm-whatsapp-connection-webhooks-card"
      description={description}
      icon={<Webhook aria-hidden="true" />}
      title="Recebimento automático"
    >
      {content}
    </ConnectionSectionCard>
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
