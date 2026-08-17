import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, Waypoints } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";
import {
  crmRoutingChannels,
  isCandidateForChannel,
  readRoutingCandidates,
  type CrmBotRoutingMode,
  type CrmChannelRouting,
  type CrmRoutingCandidate,
  type CrmRoutingChannel,
  type CrmRoutingPolicy,
} from "./crmRoutingTypes";

const staleSelection = "__stale_route__";

type RoutingDraft = {
  botConnectionId: string;
  botMode: CrmBotRoutingMode;
  defaultConnectionId: string;
};

type Drafts = Record<CrmRoutingChannel, RoutingDraft>;

export function CrmChannelRoutingPanel({
  api,
  canManage,
  connections,
  onPolicyChange,
}: {
  api: Pick<CrmWhatsappApi, "getRoutingPolicy" | "updateRoutingPolicy">;
  canManage: boolean;
  connections: readonly CrmWhatsappProviderConnection[];
  onPolicyChange?: () => Promise<void> | void;
}) {
  const [drafts, setDrafts] = useState<Drafts>(() => emptyDrafts());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [policy, setPolicy] = useState<CrmRoutingPolicy | null>(null);
  const [savingChannel, setSavingChannel] = useState<CrmRoutingChannel | null>(
    null,
  );
  const [rowError, setRowError] = useState<
    Partial<Record<CrmRoutingChannel, string>>
  >({});
  const [savedChannel, setSavedChannel] = useState<CrmRoutingChannel | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await api.getRoutingPolicy();
      setPolicy(next);
      setDrafts(draftsFromPolicy(next));
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
    () => readRoutingCandidates(connections, policy),
    [connections, policy],
  );

  const updateDraft = (
    channel: CrmRoutingChannel,
    update: Partial<RoutingDraft>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [channel]: { ...current[channel], ...update },
    }));
    setSavedChannel(null);
    setRowError((current) => ({ ...current, [channel]: undefined }));
  };

  const save = async (channel: CrmRoutingChannel) => {
    if (!canManage || savingChannel) return;
    const draft = drafts[channel];
    if (
      draft.defaultConnectionId === staleSelection ||
      (draft.botMode === "explicit_connection" &&
        (!draft.botConnectionId || draft.botConnectionId === staleSelection))
    ) {
      setRowError((current) => ({
        ...current,
        [channel]:
          "Escolha uma conexão pronta antes de substituir a rota indisponível.",
      }));
      return;
    }
    setSavingChannel(channel);
    setSavedChannel(null);
    setRowError((current) => ({ ...current, [channel]: undefined }));
    try {
      const next = await api.updateRoutingPolicy({
        bot: {
          mode: draft.botMode,
          ...(draft.botMode === "explicit_connection"
            ? { connectionId: draft.botConnectionId }
            : {}),
        },
        channel,
        defaultConnectionId: draft.defaultConnectionId || null,
      });
      setPolicy(next);
      const savedPolicy = next.channels.find(
        (item) => item.channel === channel,
      );
      if (savedPolicy) {
        setDrafts((current) => ({
          ...current,
          [channel]: draftFromChannel(savedPolicy),
        }));
      }
      await onPolicyChange?.();
      setSavedChannel(channel);
    } catch (caught) {
      setRowError((current) => ({
        ...current,
        [channel]: formatApiErrorDisplay(
          caught,
          "Não foi possível salvar esta rota.",
        ),
      }));
    } finally {
      setSavingChannel(null);
    }
  };

  return (
    <section aria-labelledby="crm-routing-title" className="crm-routing-panel">
      <header className="crm-routing-header">
        <span aria-hidden="true">
          <Waypoints />
        </span>
        <div>
          <h2 id="crm-routing-title">Rotas dos canais</h2>
          <p>
            Defina a conexão padrão do CRM e por onde o bot externo atende cada
            canal.
          </p>
        </div>
        <button
          aria-label="Atualizar rotas"
          className="crm-routing-refresh"
          disabled={isLoading || savingChannel !== null}
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
            <RoutingRow
              canManage={canManage}
              candidates={candidates}
              channel={channel}
              draft={drafts[channel]}
              error={rowError[channel] ?? null}
              isSaving={savingChannel === channel}
              key={channel}
              onChange={(update) => updateDraft(channel, update)}
              onSave={() => void save(channel)}
              policy={
                policy?.channels.find((item) => item.channel === channel) ??
                null
              }
              saved={savedChannel === channel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RoutingRow({
  canManage,
  candidates,
  channel,
  draft,
  error,
  isSaving,
  onChange,
  onSave,
  policy,
  saved,
}: {
  canManage: boolean;
  candidates: readonly CrmRoutingCandidate[];
  channel: CrmRoutingChannel;
  draft: RoutingDraft;
  error: string | null;
  isSaving: boolean;
  onChange: (update: Partial<RoutingDraft>) => void;
  onSave: () => void;
  policy: CrmChannelRouting | null;
  saved: boolean;
}) {
  const channelCandidates = candidates.filter((candidate) =>
    isCandidateForChannel(candidate, channel),
  );
  const readyCandidates = channelCandidates.filter(
    (candidate) => candidate.ready,
  );
  const defaultOptions = connectionOptions(
    readyCandidates,
    policy?.storeDefault.connection ?? null,
    policy?.storeDefault.blocked?.code === "connection_not_found",
  );
  const botOptions = connectionOptions(
    readyCandidates,
    policy?.bot.connection ?? null,
    policy?.bot.blocked?.code === "connection_not_found",
  ).filter((option) => option.value !== "");
  const pendingOlx =
    channel === "olx_chat" &&
    channelCandidates.some(
      (candidate) =>
        !candidate.ready &&
        (candidate.state === "paused" || candidate.state === "sandbox"),
    );
  const failedOlx =
    channel === "olx_chat" &&
    channelCandidates.some(
      (candidate) => !candidate.ready && candidate.state === "error",
    );
  const warnings = routeWarnings(policy);

  return (
    <article className="crm-routing-row">
      <div className="crm-routing-row-heading">
        <div>
          <strong>{channelLabel(channel)}</strong>
          <span>{readyCandidates.length} conexão(ões) pronta(s)</span>
        </div>
        <FeatureStatusBadge
          tone={readyCandidates.length ? "success" : "neutral"}
        >
          {readyCandidates.length ? "Disponível" : "Sem conexão"}
        </FeatureStatusBadge>
      </div>

      <div className="crm-routing-fields">
        <FeatureField
          hint="Usada pelo CRM; o filtro da caixa de entrada não altera esta escolha."
          label="Padrão do CRM"
        >
          <FeatureSelect
            ariaLabel={`Conexão padrão de ${channelLabel(channel)}`}
            disabled={!canManage || isSaving}
            emptyMessage="Nenhuma conexão pronta"
            onChange={(value) => onChange({ defaultConnectionId: value })}
            options={defaultOptions}
            searchable={defaultOptions.length > 5}
            value={draft.defaultConnectionId}
          />
        </FeatureField>

        <FeatureField
          hint="Desative neste canal, herde o padrão do CRM ou escolha uma conta específica."
          label="Bot externo"
        >
          <FeatureSelect
            ariaLabel={`Modo do bot em ${channelLabel(channel)}`}
            disabled={!canManage || isSaving}
            onChange={(value) => onChange({ botMode: value })}
            options={botModeOptions}
            value={draft.botMode}
          />
        </FeatureField>

        {draft.botMode === "explicit_connection" ? (
          <FeatureField label="Conexão explícita do bot">
            <FeatureSelect
              ariaLabel={`Conexão explícita do bot em ${channelLabel(channel)}`}
              disabled={!canManage || isSaving}
              emptyMessage="Nenhuma conexão pronta"
              onChange={(value) => onChange({ botConnectionId: value })}
              options={botOptions}
              searchable={botOptions.length > 5}
              value={draft.botConnectionId}
            />
          </FeatureField>
        ) : null}
      </div>

      {pendingOlx ? (
        <p className="crm-routing-note">
          O OLX Chat ainda está pendente: conclua a ativação do chat para
          torná-lo selecionável.
        </p>
      ) : null}
      {failedOlx ? (
        <p className="crm-routing-warning">
          A ativação do OLX Chat falhou. Revise a conexão e tente novamente.
        </p>
      ) : null}
      {warnings.map((warning) => (
        <p className="crm-routing-warning" key={warning}>
          {warning}
        </p>
      ))}
      {error ? (
        <p className="crm-routing-row-error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="crm-routing-success" role="status">
          Rota salva com sucesso.
        </p>
      ) : null}

      <div className="crm-routing-actions">
        {!canManage ? (
          <span>Somente administradores podem alterar rotas.</span>
        ) : null}
        <button
          className="crm-action crm-action-primary"
          disabled={!canManage || isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {isSaving ? "Salvando" : "Salvar rota"}
        </button>
      </div>
    </article>
  );
}

const botModeOptions = [
  { label: "Desativado neste canal", value: "disabled" },
  { label: "Herdar padrão do CRM", value: "inherit_store_default" },
  { label: "Escolher conexão", value: "explicit_connection" },
] as const;

function connectionOptions(
  ready: readonly CrmRoutingCandidate[],
  selected: CrmRoutingConnectionLike | null,
  stale: boolean,
) {
  const options: Array<{ disabled?: boolean; label: string; value: string }> = [
    { label: "Nenhuma conexão padrão", value: "" },
    ...ready.map((candidate) => ({
      label: candidateLabel(candidate),
      value: candidate.id,
    })),
  ];
  if (selected && !ready.some((candidate) => candidate.id === selected.id)) {
    options.push({
      disabled: true,
      label: `${readCrmWhatsappProviderLabel(selected.provider)} · ${selected.displayName} (desconectada)`,
      value: selected.id,
    });
  } else if (stale) {
    options.push({
      disabled: true,
      label: "Conexão configurada não existe mais",
      value: staleSelection,
    });
  }
  return options;
}

type CrmRoutingConnectionLike = NonNullable<
  CrmChannelRouting["storeDefault"]["connection"]
>;

function candidateLabel(candidate: CrmRoutingCandidate) {
  const identity = [candidate.displayName, candidate.phone]
    .filter(Boolean)
    .join(" · ");
  return `${readCrmWhatsappProviderLabel(candidate.provider)} · ${identity || candidate.id}`;
}

function routeWarnings(policy: CrmChannelRouting | null) {
  if (!policy) return [];
  const warnings: string[] = [];
  if (
    policy.storeDefault.blocked &&
    policy.storeDefault.blocked.code !== "policy_not_configured"
  ) {
    warnings.push(
      `Padrão do CRM: ${blockedMessage(policy.storeDefault.blocked.code)}`,
    );
  }
  if (
    policy.bot.mode !== "disabled" &&
    policy.bot.blocked &&
    policy.bot.blocked.code !== "route_disabled"
  ) {
    warnings.push(`Bot externo: ${blockedMessage(policy.bot.blocked.code)}`);
  }
  return warnings;
}

function blockedMessage(
  code: NonNullable<CrmChannelRouting["storeDefault"]["blocked"]>["code"],
) {
  switch (code) {
    case "connection_not_found":
      return "a conexão salva não existe mais. Escolha outra para corrigir a rota.";
    case "connection_not_connected":
      return "a conexão escolhida está desconectada e foi preservada.";
    case "connection_inactive":
      return "a conexão escolhida está pausada ou inativa e foi preservada.";
    case "capability_unsupported":
      return "a conexão não oferece os recursos exigidos.";
    case "channel_incompatible":
      return "a conexão não pertence a este canal.";
    case "scope_mismatch":
      return "a conexão não pertence a esta loja.";
    case "policy_not_configured":
      return "nenhuma conexão foi definida.";
    case "route_disabled":
      return "a rota está desativada.";
  }
}

function channelLabel(channel: CrmRoutingChannel) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "instagram") return "Instagram";
  return "OLX Chat";
}

function draftsFromPolicy(policy: CrmRoutingPolicy): Drafts {
  const drafts = emptyDrafts();
  for (const channel of policy.channels)
    drafts[channel.channel] = draftFromChannel(channel);
  return drafts;
}

function draftFromChannel(channel: CrmChannelRouting): RoutingDraft {
  return {
    botConnectionId:
      channel.bot.connection?.id ??
      (channel.bot.blocked?.code === "connection_not_found"
        ? staleSelection
        : ""),
    botMode: channel.bot.mode,
    defaultConnectionId:
      channel.storeDefault.connection?.id ??
      (channel.storeDefault.blocked?.code === "connection_not_found"
        ? staleSelection
        : ""),
  };
}

function emptyDrafts(): Drafts {
  const empty = (): RoutingDraft => ({
    botConnectionId: "",
    botMode: "disabled",
    defaultConnectionId: "",
  });
  return { instagram: empty(), olx_chat: empty(), whatsapp: empty() };
}
