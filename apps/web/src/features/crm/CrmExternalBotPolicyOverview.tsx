import { externalBotActionRegistry } from "@lojaveiculosv2/shared";
import type { CrmRoutingChannel, CrmRoutingPolicy } from "./crmRoutingTypes";

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
  return (
    <section aria-label="Políticas do External Bot" className="crm-bot-policy">
      <header>
        <div>
          <h3>Políticas por canal</h3>
          <p>
            Cada ação usa a rota pronta do canal e permanece bloqueada quando a
            conexão ou a capacidade exigida não está disponível.
          </p>
        </div>
        <span>
          {effectiveConnection?.displayName ?? "Rota não configurada"}
        </span>
      </header>
      <div aria-label="Canais do External Bot" role="tablist">
        {(["whatsapp", "instagram", "olx_chat"] as const).map((channel) => (
          <button
            aria-selected={activeChannel === channel}
            key={channel}
            onClick={() => onChannelChange(channel)}
            role="tab"
            type="button"
          >
            {channel === "olx_chat"
              ? "OLX Chat"
              : channel === "whatsapp"
                ? "WhatsApp"
                : "Instagram"}
          </button>
        ))}
      </div>
      <div className="crm-bot-action-list">
        {externalBotActionRegistry.map((action) => (
          <div key={action}>
            <code>{action}</code>
            <span>
              {mode === "disabled" ? "Desabilitada" : "Auto"} ·{" "}
              {effectiveConnection?.readiness?.ready ? "Pronta" : "Bloqueada"}
            </span>
          </div>
        ))}
      </div>
      <small>
        Cooldown, limites por conexão e limite diário são server-owned. O modo
        Proposal cria uma proposta pendente e nunca executa um efeito externo.
      </small>
    </section>
  );
}
