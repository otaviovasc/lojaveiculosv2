import { Bot, KeyRound, LinkIcon, Save, ShieldCheck } from "lucide-react";
import type { CrmExternalBotConfiguration } from "@lojaveiculosv2/shared";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import type { CrmConversationApi } from "./crmConversationApi";

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
              <LinkIcon aria-hidden="true" />
              <input
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
              <KeyRound aria-hidden="true" />
              <input
                id="crm-bot-secret"
                onChange={(event) => props.onSecretChange(event.target.value)}
                placeholder={
                  secretConfigured
                    ? "Segredo configurado"
                    : "Mínimo 8 caracteres"
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
              <KeyRound aria-hidden="true" />
              <input
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
