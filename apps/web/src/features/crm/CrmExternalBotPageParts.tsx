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
  enabled: boolean;
  integration: CrmExternalBotConfiguration | null;
  isSaving: boolean;
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
          <h2>Bot Externo</h2>
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
          {secretConfigured ? "Segredo configurado" : "Sem segredo"}
        </FeatureStatusBadge>
      </div>

      <div className="crm-bot-form-grid">
        <div className="crm-bot-inputs-row">
          <label className="crm-bot-form-field">
            <span className="crm-bot-field-label">Webhook URL</span>
            <span className="crm-bot-input-wrap">
              <LinkIcon aria-hidden="true" />
              <input
                onChange={(event) =>
                  props.onWebhookUrlChange(event.target.value)
                }
                placeholder="https://bot.exemplo.com/webhook"
                type="url"
                value={props.webhookUrl}
              />
            </span>
          </label>

          <label className="crm-bot-form-field">
            <span className="crm-bot-field-label">
              Novo segredo (Header X-Webhook-Secret)
            </span>
            <span className="crm-bot-input-wrap">
              <KeyRound aria-hidden="true" />
              <input
                onChange={(event) => props.onSecretChange(event.target.value)}
                placeholder={
                  secretConfigured
                    ? "Segredo configurado (digite para alterar)"
                    : "Mínimo 8 caracteres"
                }
                type="password"
                value={props.secretDraft}
              />
            </span>
          </label>
        </div>

        <label className="crm-bot-form-switch-card">
          <div className="crm-bot-switch-info">
            <strong>Habilitar encaminhamento para o bot</strong>
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
