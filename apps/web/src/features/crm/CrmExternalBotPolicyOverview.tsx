import { externalBotActionRegistry } from "@lojaveiculosv2/shared";
import { Cpu } from "lucide-react";
import type { CrmRoutingChannel, CrmRoutingPolicy } from "./crmRoutingTypes";
import { InstagramLogo, OlxLogo, WhatsAppLogo } from "./CrmChannelLogos";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";

const channelMeta: Record<
  CrmRoutingChannel,
  { label: string; icon: typeof WhatsAppLogo }
> = {
  whatsapp: { label: "WhatsApp", icon: WhatsAppLogo },
  instagram: { label: "Instagram", icon: InstagramLogo },
  olx_chat: { label: "OLX Chat", icon: OlxLogo },
};

export function CrmExternalBotPolicyOverview({
  activeChannel,
  onChannelChange,
  policy,
}: {
  activeChannel: CrmRoutingChannel;
  onChannelChange: (channel: CrmRoutingChannel) => void;
  policy: CrmRoutingPolicy | null;
}) {
  const route = policy?.channels.find((item) => item.channel === activeChannel);
  const effectiveConnection = route?.storeDefault.connection;
  const mode = route?.externalBot.mode === "disabled" ? "disabled" : "auto";
  const isReady = Boolean(effectiveConnection?.readiness?.ready);

  return (
    <section
      aria-label="Políticas do External Bot"
      className="crm-bot-policy"
      data-channel={activeChannel}
    >
      <span aria-hidden="true" className="crm-bot-policy-watermark">
        <Cpu />
      </span>

      <header className="crm-bot-policy-header">
        <span aria-hidden="true" className="crm-bot-policy-icon">
          <Cpu />
        </span>
        <div className="crm-bot-policy-info">
          <strong className="crm-bot-policy-eyebrow">
            Roteamento de Ações
          </strong>
          <h3>Políticas por Canal</h3>
          <p>
            Cada ação executada pelo bot consome a conexão padrão do canal e
            permanece protegida contra disparos não autorizados.
          </p>
        </div>
        <div className="crm-bot-policy-status-wrap">
          <FeatureStatusBadge
            className="crm-bot-policy-status"
            tone={isReady ? "success" : "neutral"}
          >
            {effectiveConnection?.displayName ?? "Rota não configurada"}
          </FeatureStatusBadge>
        </div>
      </header>

      <div
        aria-label="Canais do External Bot"
        className="crm-bot-channel-tabs"
        role="tablist"
      >
        {(["whatsapp", "instagram", "olx_chat"] as const).map((channel) => {
          const MetaIcon = channelMeta[channel].icon;
          const isSelected = activeChannel === channel;
          return (
            <button
              aria-selected={isSelected}
              className={`crm-bot-channel-tab ${
                isSelected ? "crm-bot-channel-tab-active" : ""
              }`}
              data-channel={channel}
              key={channel}
              onClick={() => onChannelChange(channel)}
              role="tab"
              type="button"
            >
              <MetaIcon aria-hidden="true" className="size-4" />
              <span>{channelMeta[channel].label}</span>
            </button>
          );
        })}
      </div>

      <div className="crm-bot-action-grid">
        {externalBotActionRegistry.map((action) => (
          <div className="crm-bot-action-card" key={action}>
            <code>{action}</code>
            <span
              className={`crm-bot-action-badge ${
                isReady && mode !== "disabled"
                  ? "crm-bot-action-ready"
                  : "crm-bot-action-blocked"
              }`}
            >
              {mode === "disabled" ? "Desabilitada" : "Auto"} ·{" "}
              {isReady ? "Pronta" : "Bloqueada"}
            </span>
          </div>
        ))}
      </div>

      <p className="crm-bot-policy-footer">
        Cooldown, limites por conexão e limite diário são gerenciados pelo
        servidor. O modo Proposal cria propostas com confirmação humana e nunca
        executa efeitos colaterais sem auditoria.
      </p>
    </section>
  );
}
