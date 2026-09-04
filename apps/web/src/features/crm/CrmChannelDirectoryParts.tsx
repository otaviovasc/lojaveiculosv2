import { ArrowRight, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  readConnectionCapabilityLabels,
  readConnectionReadinessBadge,
} from "./crmChannelPresentation";
import { readCrmProviderLabel } from "./crmConnectionStatus";
import type { CrmProviderConnection } from "./crmConversationTypes";
import {
  InstagramLogo,
  MetaLogo,
  WhatsAppLogo,
  OlxLogo,
} from "./CrmChannelLogos";

export function readConnectionRowIcon(
  connection: CrmProviderConnection,
): ReactNode {
  if (connection.channel === "instagram") {
    return <InstagramLogo className="size-6" />;
  }
  if (connection.channel === "olx_chat" || connection.provider === "olx") {
    return <OlxLogo className="size-6" />;
  }
  if (connection.provider === "meta_cloud") {
    return <MetaLogo className="size-6" />;
  }
  return <WhatsAppLogo className="size-6" />;
}

export function ConnectedChannelRow({
  connection,
  onManage,
  onRepair,
}: {
  connection: CrmProviderConnection;
  onManage?: (connection: CrmProviderConnection) => void;
  onRepair?: (connection: CrmProviderConnection) => void;
}) {
  const badge = readConnectionReadinessBadge(connection);
  const capabilityLabels = readConnectionCapabilityLabels(connection);
  const repairNeeded = needsConnectionRepair(connection);
  const onAction = repairNeeded && onRepair ? onRepair : onManage;
  const secondary = [
    readCrmProviderLabel(connection.provider),
    connection.phone,
  ]
    .filter(Boolean)
    .join(" · ");

  const channelKey = connection.channel ?? "whatsapp";
  const providerKey = connection.provider;

  const body = (
    <>
      <span aria-hidden="true" className="crm-channel-card-watermark">
        {readConnectionRowIcon(connection)}
      </span>
      <span aria-hidden="true" className="crm-channel-icon">
        {readConnectionRowIcon(connection)}
      </span>
      <span className="crm-channel-body">
        <span className="crm-channel-title">
          <strong>{connection.displayName}</strong>
          {connection.isDefault === true ? (
            <span className="crm-channel-badge" data-tone="success">
              Padrão
            </span>
          ) : null}
          <span className="crm-channel-badge" data-tone={badge.tone}>
            {badge.label}
          </span>
        </span>
        <span className="crm-channel-description">
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
      {onAction ? (
        <span className="crm-channel-row-action">
          {repairNeeded && onRepair ? "Reparar conexão" : null}
          <ArrowRight aria-hidden="true" className="crm-channel-chevron" />
        </span>
      ) : null}
    </>
  );

  if (!onAction) {
    return (
      <div
        className="crm-channel-row"
        data-channel={channelKey}
        data-provider={providerKey}
      >
        {body}
      </div>
    );
  }
  return (
    <button
      className="crm-channel-row"
      data-actionable="true"
      data-channel={channelKey}
      data-provider={providerKey}
      onClick={() => onAction(connection)}
      type="button"
    >
      {body}
    </button>
  );
}

export function needsConnectionRepair(connection: CrmProviderConnection) {
  const lifecycle = connection.state ?? connection.status;
  return (
    connection.setup?.status === "failed" ||
    connection.setup?.status === "partial" ||
    (connection.setup?.status === "configuring" &&
      connection.credentials?.storedInstanceConfigured !== true) ||
    connection.readiness?.ready === false ||
    connection.live?.providerStatus === "disconnected" ||
    connection.live?.providerStatus === "error" ||
    lifecycle === "disconnected" ||
    lifecycle === "error"
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
