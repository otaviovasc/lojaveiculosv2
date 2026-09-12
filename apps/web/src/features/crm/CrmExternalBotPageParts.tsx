import { Bot, KeyRound, LinkIcon, Plus, Save, ShieldCheck } from "lucide-react";
import * as React from "react";
import type {
  CrmExternalBotConfiguration,
  CrmExternalBotProfile,
} from "@lojaveiculosv2/shared";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import { CrmSelect } from "./CrmFormControls";

export type CrmExternalBotPageProps = {
  api: CrmConversationApi;
  canManage: boolean;
  canRead: boolean;
  canRetry: boolean;
};

export type BotIntegrationFormProps = {
  apiTokenDraft: string;
  enabled: boolean;
  integration: CrmExternalBotConfiguration | null;
  isSaving: boolean;
  onApiTokenChange: (value: string) => void;
  onClearApiToken: () => void;
  onClearSecret: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onSave: () => void;
  onSecretChange: (value: string) => void;
  onWebhookUrlChange: (value: string) => void;
  secretDraft: string;
  webhookUrl: string;
};

export function BotIntegrationForm(props: BotIntegrationFormProps) {
  const secretConfigured = Boolean(props.integration?.secretConfigured);
  const apiTokenConfigured = Boolean(props.integration?.apiTokenConfigured);
  return (
    <div className="crm-bot-form">
      <span aria-hidden="true" className="crm-bot-card-watermark">
        <Bot />
      </span>

      <div className="crm-bot-form-header">
        <span aria-hidden="true" className="crm-bot-header-icon">
          <Bot />
        </span>
        <div className="crm-bot-header-info">
          <strong className="crm-bot-eyebrow">Automação & Webhooks</strong>
          <h2>Bot externo</h2>
          <p>
            Encaminhe mensagens e eventos em tempo real para n8n, Typebot ou seu
            serviço próprio de automação.
          </p>
        </div>
        <FeatureStatusBadge
          className="crm-bot-form-status"
          tone={props.enabled && secretConfigured ? "success" : "neutral"}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          {props.enabled ? "Ativo" : "Inativo"} ·{" "}
          {secretConfigured ? "Segredo configurado" : "Sem segredo"} ·{" "}
          {apiTokenConfigured ? "Token configurado" : "Sem token"}
        </FeatureStatusBadge>
      </div>

      <div className="crm-bot-form-grid">
        <div className="crm-bot-inputs-row">
          <div className="crm-bot-form-field">
            <label
              className="crm-bot-field-label"
              htmlFor="crm-bot-webhook-url"
            >
              Webhook URL
            </label>
            <span className="crm-bot-input-wrap">
              <LinkIcon aria-hidden="true" className="crm-bot-input-icon" />
              <input
                className="crm-bot-input"
                id="crm-bot-webhook-url"
                onChange={(event) =>
                  props.onWebhookUrlChange(event.target.value)
                }
                placeholder="https://bot.exemplo.com/webhook"
                type="url"
                value={props.webhookUrl}
              />
            </span>
          </div>

          <div className="crm-bot-form-field">
            <label className="crm-bot-field-label" htmlFor="crm-bot-secret">
              Novo segredo (assinatura HMAC dos eventos entregues no webhook)
            </label>
            <span className="crm-bot-input-wrap">
              <KeyRound aria-hidden="true" className="crm-bot-input-icon" />
              <input
                className="crm-bot-input"
                id="crm-bot-secret"
                onChange={(event) => props.onSecretChange(event.target.value)}
                placeholder={
                  secretConfigured
                    ? "Segredo configurado"
                    : "Mínimo 32 caracteres"
                }
                type="password"
                value={props.secretDraft}
              />
            </span>
          </div>
        </div>

        <div className="crm-bot-inputs-row">
          <div className="crm-bot-form-field">
            <label className="crm-bot-field-label" htmlFor="crm-bot-api-token">
              Novo token da API de acoes (Bearer de POST /crm/bot/actions)
            </label>
            <span className="crm-bot-input-wrap">
              <KeyRound aria-hidden="true" className="crm-bot-input-icon" />
              <input
                className="crm-bot-input"
                id="crm-bot-api-token"
                onChange={(event) => props.onApiTokenChange(event.target.value)}
                placeholder={
                  apiTokenConfigured
                    ? "Token configurado"
                    : "Mínimo 32 caracteres"
                }
                type="password"
                value={props.apiTokenDraft}
              />
            </span>
            <p>
              Token write-only usado pelo bot para chamar a Bot Action API com{" "}
              <code>Authorization: Bearer</code>. Nao e o mesmo que o segredo do
              webhook.
            </p>
          </div>
        </div>

        <label className="crm-bot-form-switch-card">
          <div className="crm-bot-switch-info">
            <strong>Bot habilitado</strong>
            <p>
              Quando ativo, mensagens e eventos dos canais autorizados disparam
              requisições POST para a URL configurada acima.
            </p>
          </div>
          <div className="crm-bot-switch-toggle">
            <input
              checked={props.enabled}
              onChange={(event) => props.onEnabledChange(event.target.checked)}
              type="checkbox"
            />
            <span className="crm-bot-switch-slider" aria-hidden="true" />
          </div>
        </label>

        <div className="crm-bot-routing-callout">
          <p>
            <strong>Uma URL para todos os números:</strong> esta Webhook URL
            recebe os eventos de todas as conexões roteadas para o bot (ex.: os
            dois números de WhatsApp da loja). Cada evento inclui{" "}
            <code>channel</code> e <code>connectionId</code>, então o mesmo bot
            consegue identificar de qual número a mensagem veio — se os dois
            números usam o mesmo bot, basta apontar a mesma URL.
          </p>
          <p>
            <strong>Roteamento por canal:</strong> Para definir quais números e
            perfis de WhatsApp, Instagram ou OLX devem acionar este bot, acesse
            a área <strong>Conexões</strong> e configure as rotas individuais.
          </p>
        </div>

        <div className="crm-bot-form-actions">
          <button
            className="crm-action crm-action-primary"
            disabled={props.isSaving}
            onClick={props.onSave}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            {props.isSaving ? "Salvando..." : "Salvar configurações"}
          </button>
          {secretConfigured ? (
            <button
              className="crm-action crm-action-secondary"
              disabled={props.isSaving}
              onClick={props.onClearSecret}
              type="button"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              Remover segredo
            </button>
          ) : null}
          {apiTokenConfigured ? (
            <button
              className="crm-action crm-action-secondary"
              disabled={props.isSaving}
              onClick={props.onClearApiToken}
              type="button"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              Remover token
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ExternalBotProfilesManager({
  api,
  canManage,
}: {
  api: CrmConversationApi;
  canManage: boolean;
}) {
  const [profiles, setProfiles] = React.useState<CrmExternalBotProfile[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [token, setToken] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [enabled, setEnabled] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const result = await api.listBotProfiles();
      setProfiles(result.profiles);
      const current =
        result.profiles.find((profile) => profile.id === selectedId) ??
        result.profiles[0];
      if (current) {
        setSelectedId(current.id);
        setName(current.name);
        setUrl(current.webhookUrl ?? "");
        setEnabled(current.enabled);
      }
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível carregar os perfis."),
      );
    }
  }, [api, selectedId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selectProfile = (profile: CrmExternalBotProfile) => {
    setSelectedId(profile.id);
    setName(profile.name);
    setUrl(profile.webhookUrl ?? "");
    setEnabled(profile.enabled);
    setToken("");
    setSecret("");
  };

  const save = async () => {
    if (!canManage || isSaving || !name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        enabled,
        webhookUrl: url.trim() || null,
        ...(token.trim() ? { apiToken: token.trim() } : {}),
        ...(secret.trim() ? { webhookSecret: secret.trim() } : {}),
      };
      const saved = selectedId
        ? await api.updateBotProfile(selectedId, input)
        : await api.createBotProfile(input);
      setSelectedId(saved.id);
      setToken("");
      setSecret("");
      await load();
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível salvar o perfil."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const createNew = () => {
    setSelectedId(null);
    setName("Novo bot");
    setUrl("");
    setToken("");
    setSecret("");
    setEnabled(false);
  };

  return (
    <div className="crm-bot-form">
      <div className="crm-bot-form-header">
        <span aria-hidden="true" className="crm-bot-header-icon">
          <Bot />
        </span>
        <div className="crm-bot-header-info">
          <strong className="crm-bot-eyebrow">Perfis de automação</strong>
          <h2>Conexões de bots externos</h2>
          <p>
            Crie endpoints independentes e reutilize cada perfil em uma ou mais
            conexões.
          </p>
        </div>
        <button
          className="crm-action crm-action-secondary"
          onClick={createNew}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" /> Novo perfil
        </button>
      </div>
      <div className="crm-bot-inputs-row">
        <div className="crm-bot-form-field">
          <label
            className="crm-bot-field-label"
            htmlFor="crm-bot-profile-select"
          >
            Perfil
          </label>
          <CrmSelect
            ariaLabel="Perfil"
            className="crm-bot-input"
            onChange={(value) => {
              const profile = profiles.find((item) => item.id === value);
              if (profile) selectProfile(profile);
              else createNew();
            }}
            options={[
              { label: "Novo perfil", value: "" },
              ...profiles.map((profile) => ({
                label: `${profile.name}${profile.isDefault ? " (padrão)" : ""}`,
                value: profile.id,
              })),
            ]}
            placeholder="Selecionar perfil"
            value={selectedId ?? ""}
          />
        </div>
        <div className="crm-bot-form-field">
          <label className="crm-bot-field-label" htmlFor="crm-bot-profile-name">
            Nome
          </label>
          <input
            className="crm-bot-input"
            id="crm-bot-profile-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
      </div>
      <div className="crm-bot-form-grid">
        <div className="crm-bot-form-field">
          <label className="crm-bot-field-label" htmlFor="crm-bot-profile-url">
            <LinkIcon aria-hidden="true" className="inline size-4" /> Webhook
            URL
          </label>
          <input
            className="crm-bot-input"
            id="crm-bot-profile-url"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://bot.exemplo.com/webhook"
            type="url"
            value={url}
          />
        </div>
        <div className="crm-bot-form-field">
          <label
            className="crm-bot-field-label"
            htmlFor="crm-bot-profile-token"
          >
            <KeyRound aria-hidden="true" className="inline size-4" /> Novo token
            de ações
          </label>
          <input
            className="crm-bot-input"
            id="crm-bot-profile-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder="Mínimo 32 caracteres"
            type="password"
            value={token}
          />
        </div>
        <div className="crm-bot-form-field">
          <label
            className="crm-bot-field-label"
            htmlFor="crm-bot-profile-secret"
          >
            <KeyRound aria-hidden="true" className="inline size-4" /> Novo
            segredo HMAC
          </label>
          <input
            className="crm-bot-input"
            id="crm-bot-profile-secret"
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Mínimo 32 caracteres"
            type="password"
            value={secret}
          />
        </div>
        <label className="crm-bot-form-switch-card">
          <span className="crm-bot-switch-info">
            <strong>Perfil habilitado</strong>
            <p>
              Eventos roteados para as conexões atribuídas serão enviados a este
              perfil.
            </p>
          </span>
          <span className="crm-bot-switch-toggle">
            <input
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
            <span aria-hidden="true" className="crm-bot-switch-slider" />
          </span>
        </label>
      </div>
      <div className="crm-bot-form-actions">
        <button
          className="crm-action crm-action-primary"
          disabled={!canManage || isSaving}
          onClick={() => void save()}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          {isSaving ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>
      {error ? (
        <p className="crm-integrations-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PermissionNotice({
  message = "Seu usuário não tem permissão para gerenciar integrações.",
}: {
  message?: string;
}) {
  return (
    <div className="crm-bot-permission-card">
      <Bot aria-hidden="true" className="size-6" />
      <div>
        <strong>Acesso restrito</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
