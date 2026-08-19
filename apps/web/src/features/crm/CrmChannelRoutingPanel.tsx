import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Waypoints } from "lucide-react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import { readCrmProviderLabel } from "./crmConnectionStatus";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { CrmChannelRoutingEditDialog } from "./CrmChannelRoutingPanelDialog";
import { InstagramLogo, WhatsAppLogo, OlxLogo } from "./CrmChannelLogos";
import {
  crmRoutingChannels,
  readRoutingCandidates,
  type CrmChannelRouting,
  type CrmRoutingChannel,
  type CrmRoutingPolicy,
} from "./crmRoutingTypes";

const channelLabels: Record<CrmRoutingChannel, string> = {
  instagram: "Instagram",
  olx_chat: "OLX Chat",
  whatsapp: "WhatsApp",
};

function readRoutingChannelIcon(channel: CrmRoutingChannel) {
  if (channel === "instagram") {
    return <InstagramLogo className="size-6" />;
  }
  if (channel === "olx_chat") {
    return <OlxLogo className="size-6" />;
  }
  return <WhatsAppLogo className="size-6" />;
}

export function CrmChannelRoutingPanel({
  api,
  canManage,
  connections,
  onPolicyChange,
}: {
  api: Pick<CrmConversationApi, "getRoutingPolicy" | "updateRoutingPolicy">;
  canManage: boolean;
  connections: readonly CrmProviderConnection[];
  onPolicyChange?: () => Promise<void> | void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [policy, setPolicy] = useState<CrmRoutingPolicy | null>(null);
  const [editingChannel, setEditingChannel] =
    useState<CrmRoutingChannel | null>(null);
  const [savedChannel, setSavedChannel] = useState<CrmRoutingChannel | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPolicy(await api.getRoutingPolicy());
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível carregar as rotas dos canais.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const candidates = useMemo(
    () => readRoutingCandidates(connections),
    [connections, policy],
  );

  const onSaved = async (
    next: CrmRoutingPolicy,
    channel: CrmRoutingChannel,
  ) => {
    setPolicy(next);
    setSavedChannel(channel);
    await onPolicyChange?.();
  };

  return (
    <section aria-labelledby="crm-routing-title" className="crm-routing-panel">
      <header className="crm-routing-header">
        <div className="crm-routing-header-main">
          <span aria-hidden="true" className="crm-routing-header-icon">
            <Waypoints />
          </span>
          <div className="crm-routing-header-text">
            <h2 id="crm-routing-title">Rotas dos canais</h2>
            <p>A conexão padrão que atende os clientes em cada canal.</p>
          </div>
        </div>
        <button
          aria-label="Atualizar rotas"
          className="crm-routing-refresh"
          disabled={isLoading}
          onClick={() => void refresh()}
          title="Atualizar rotas"
          type="button"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </header>

      {isLoading ? (
        <p className="crm-routing-state" role="status">
          <Loader2 aria-hidden="true" className="animate-spin" />
          Carregando rotas configuradas.
        </p>
      ) : error ? (
        <div className="crm-routing-state crm-routing-state-error" role="alert">
          <p>{error}</p>
          <button
            className="crm-action crm-action-secondary"
            onClick={() => void refresh()}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="crm-routing-list">
          {crmRoutingChannels.map((channel) => (
            <RoutingSummaryRow
              canManage={canManage}
              channel={channel}
              key={channel}
              onEdit={() => {
                setSavedChannel(null);
                setEditingChannel(channel);
              }}
              policy={
                policy?.channels.find((item) => item.channel === channel) ??
                null
              }
              saved={savedChannel === channel}
            />
          ))}
        </div>
      )}

      {editingChannel ? (
        <CrmChannelRoutingEditDialog
          api={api}
          candidates={candidates}
          channel={editingChannel}
          channelLabel={channelLabels[editingChannel]}
          onClose={() => setEditingChannel(null)}
          onSaved={(next, channel) => void onSaved(next, channel)}
          policy={
            policy?.channels.find((item) => item.channel === editingChannel) ??
            null
          }
        />
      ) : null}
    </section>
  );
}

function RoutingSummaryRow({
  canManage,
  channel,
  onEdit,
  policy,
  saved,
}: {
  canManage: boolean;
  channel: CrmRoutingChannel;
  onEdit: () => void;
  policy: CrmChannelRouting | null;
  saved: boolean;
}) {
  const route = policy?.storeDefault ?? null;
  const blocked =
    route?.blocked && route.blocked.code !== "policy_not_configured"
      ? route.blocked
      : null;
  const summary = readRouteSummary(policy);
  const tone = blocked ? "warning" : route?.ready ? "success" : "neutral";
  const toneLabel = blocked
    ? "Atenção"
    : route?.ready
      ? "Rota ativa"
      : "Sem rota";

  return (
    <article className="crm-routing-row" data-channel={channel}>
      <span aria-hidden="true" className="crm-routing-card-watermark">
        {readRoutingChannelIcon(channel)}
      </span>
      <div className="crm-routing-row-main">
        <span aria-hidden="true" className="crm-routing-channel-icon">
          {readRoutingChannelIcon(channel)}
        </span>
        <div className="crm-routing-row-content">
          <div className="crm-routing-row-heading">
            <strong>{channelLabels[channel]}</strong>
            <FeatureStatusBadge tone={tone}>{toneLabel}</FeatureStatusBadge>
          </div>
          <p className="crm-routing-summary-text">{summary}</p>
          <p className="crm-routing-bot-summary">{readBotSummary(policy)}</p>
          {blocked ? (
            <p className="crm-routing-warning" role="note">
              {blocked.message} {blocked.remediation}
            </p>
          ) : null}
          {saved ? (
            <p className="crm-routing-success" role="status">
              Rota salva com sucesso.
            </p>
          ) : null}
        </div>
      </div>

      <div className="crm-routing-actions">
        {!canManage ? (
          <span>Somente administradores podem alterar rotas.</span>
        ) : null}
        <button
          className="crm-action crm-action-secondary"
          disabled={!canManage}
          onClick={onEdit}
          type="button"
        >
          <Pencil aria-hidden="true" />
          {route?.connection ? "Editar rota" : "Definir rota"}
        </button>
      </div>
    </article>
  );
}

function readRouteSummary(policy: CrmChannelRouting | null) {
  const route = policy?.storeDefault;
  if (!route?.connection) {
    return "Nenhuma conexão padrão definida.";
  }
  const label = `${readCrmProviderLabel(route.connection.provider)} · ${route.connection.displayName}`;
  return route.ready ? `${label} — pronta` : `${label} — indisponível`;
}

function readBotSummary(policy: CrmChannelRouting | null) {
  const bot = policy?.externalBot;
  if (!bot || bot.mode === "disabled") {
    return "Bot externo desativado neste canal.";
  }
  if (bot.mode === "inherit_store_default") {
    return "Bot externo segue o padrão do CRM.";
  }
  if (bot.connection) {
    return `Bot externo atende por ${readCrmProviderLabel(bot.connection.provider)} · ${bot.connection.displayName}.`;
  }
  return "Bot externo sem conexão válida neste canal.";
}
