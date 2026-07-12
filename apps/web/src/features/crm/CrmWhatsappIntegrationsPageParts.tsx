import { Bot, KeyRound, LinkIcon, Save, ShieldCheck } from "lucide-react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappBotIntegration } from "./crmWhatsappIntegrationTypes";

export type CrmWhatsappIntegrationsPageProps = {
  api: CrmWhatsappApi;
  canManage: boolean;
  canRead: boolean;
  canRetry: boolean;
};

export type BotIntegrationFormProps = {
  enabled: boolean;
  integration: CrmWhatsappBotIntegration | null;
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
    <div className="crm-whatsapp-bot-form">
      <div className="crm-whatsapp-bot-form-header">
        <span aria-hidden="true">
          <Bot />
        </span>
        <div>
          <strong>Bot externo</strong>
          <h2>Automacao</h2>
          <p>Encaminhe mensagens para n8n, Typebot ou seu bot proprio.</p>
        </div>
        <FeatureStatusBadge
          className="crm-whatsapp-bot-form-status"
          tone={props.enabled && secretConfigured ? "success" : "neutral"}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          {props.enabled ? "Ativo" : "Inativo"} ·{" "}
          {secretConfigured ? "Segredo configurado" : "Sem segredo"}
        </FeatureStatusBadge>
      </div>

      <div className="crm-whatsapp-bot-form-grid">
        <label className="crm-whatsapp-bot-form-field">
          Webhook URL
          <span>
            <LinkIcon aria-hidden="true" />
            <input
              onChange={(event) => props.onWebhookUrlChange(event.target.value)}
              placeholder="https://bot.exemplo.com/webhook"
              type="url"
              value={props.webhookUrl}
            />
          </span>
        </label>

        <label className="crm-whatsapp-bot-form-field">
          Novo segredo
          <span>
            <KeyRound aria-hidden="true" />
            <input
              onChange={(event) => props.onSecretChange(event.target.value)}
              placeholder={
                secretConfigured ? "Segredo configurado" : "Minimo 8 caracteres"
              }
              type="password"
              value={props.secretDraft}
            />
          </span>
        </label>

        <label className="crm-whatsapp-bot-form-toggle">
          <input
            checked={props.enabled}
            onChange={(event) => props.onEnabledChange(event.target.checked)}
            type="checkbox"
          />
          Bot habilitado
        </label>

        <div className="crm-whatsapp-bot-form-actions">
          <button
            className="crm-action crm-action-primary"
            disabled={props.isSaving}
            onClick={props.onSave}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            Salvar
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

export function PermissionNotice() {
  return (
    <div className="rounded-xl border border-line/35 bg-panel/10 p-4 text-sm font-bold text-muted">
      Seu usuário não tem permissão para gerenciar integrações.
    </div>
  );
}
