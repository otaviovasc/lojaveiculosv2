import {
  ArrowRight,
  Camera,
  MessageCircle,
  MessageSquareText,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  readConnectionCapabilityLabels,
  readConnectionReadinessBadge,
} from "./crmChannelPresentation";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";

export function readConnectionRowIcon(
  connection: CrmWhatsappProviderConnection,
): ReactNode {
  if (connection.channel === "instagram") {
    return <Camera aria-hidden="true" />;
  }
  if (connection.channel === "olx_chat") {
    return <MessageSquareText aria-hidden="true" />;
  }
  return <MessageCircle aria-hidden="true" />;
}

export function ConnectedChannelRow({
  connection,
  onManage,
}: {
  connection: CrmWhatsappProviderConnection;
  onManage?: (connection: CrmWhatsappProviderConnection) => void;
}) {
  const badge = readConnectionReadinessBadge(connection);
  const capabilityLabels = readConnectionCapabilityLabels(connection);
  const secondary = [
    readCrmWhatsappProviderLabel(connection.provider),
    connection.phone,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      <span aria-hidden="true" className="crm-whatsapp-channel-icon">
        {readConnectionRowIcon(connection)}
      </span>
      <span className="crm-whatsapp-channel-body">
        <span className="crm-whatsapp-channel-title">
          {connection.displayName}
          {connection.isDefault === true ? (
            <span className="crm-whatsapp-channel-badge" data-tone="success">
              Padrão
            </span>
          ) : null}
          <span className="crm-whatsapp-channel-badge" data-tone={badge.tone}>
            {badge.label}
          </span>
        </span>
        <span className="crm-whatsapp-channel-description">
          {secondary}
          {badge.detail ? ` — ${badge.detail}` : ""}
        </span>
        {capabilityLabels.length ? (
          <span className="crm-channel-capabilities">
            {capabilityLabels.map((label) => (
              <span className="crm-channel-capability" key={label}>
                {label}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      {onManage ? (
        <ArrowRight
          aria-hidden="true"
          className="crm-whatsapp-channel-chevron"
        />
      ) : null}
    </>
  );

  if (!onManage) {
    return <div className="crm-whatsapp-channel-row">{body}</div>;
  }
  return (
    <button
      className="crm-whatsapp-channel-row"
      data-actionable="true"
      onClick={() => onManage(connection)}
      type="button"
    >
      {body}
    </button>
  );
}

export function ChannelIdentity({
  broker,
  channel,
  transport,
}: {
  broker: string;
  channel: string;
  transport: string;
}) {
  return (
    <span className="crm-channel-identity">
      <span>
        <small>Canal</small>
        {channel}
      </span>
      <span>
        <small>Transporte</small>
        {transport}
      </span>
      <span>
        <small>Credencial</small>
        {broker}
      </span>
    </span>
  );
}

export function ZapiAddonBadge({
  contract,
}: {
  contract: CrmWhatsappZapiAddonContract | null;
}) {
  if (contract?.status === "active") {
    return (
      <span className="crm-whatsapp-channel-badge" data-tone="success">
        Adicional ativo
      </span>
    );
  }
  if (contract?.status === "pending") {
    return (
      <span className="crm-whatsapp-channel-badge" data-tone="warning">
        Pagamento pendente
      </span>
    );
  }
  if (contract?.status === "scheduled") {
    return (
      <span className="crm-whatsapp-channel-badge" data-tone="warning">
        Ativação agendada
      </span>
    );
  }
  if (contract?.status === "paid_awaiting_setup") {
    return (
      <span className="crm-whatsapp-channel-badge" data-tone="warning">
        Em preparação
      </span>
    );
  }
  return (
    <span className="crm-whatsapp-channel-badge" data-tone="muted">
      Adicional opcional
    </span>
  );
}

export function readZapiChooserDescription(
  contract: CrmWhatsappZapiAddonContract | null,
) {
  if (contract?.status === "pending") {
    return "Solicitação registrada; aguardando confirmação de pagamento.";
  }
  if (contract?.status === "scheduled") {
    return "Ativação programada para o próximo vencimento da assinatura.";
  }
  if (contract?.status === "paid_awaiting_setup") {
    return "Pagamento confirmado; a equipe está preparando a conexão.";
  }
  if (contract?.status === "active") {
    return "Adicional ativo. Informe as credenciais uma única vez para parear o telefone.";
  }
  return "Integração opcional paga. O valor e as condições vêm da assinatura da loja.";
}
