import { KeyRound, LinkIcon, Save, ShieldCheck } from "lucide-react";
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
    <div className="rounded-xl border border-line/35 bg-panel/10 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-wide text-muted">
            Bot externo
          </span>
          <h2 className="text-lg font-black text-app-text">Integracao</h2>
        </div>
        <FeatureStatusBadge
          tone={props.enabled && secretConfigured ? "success" : "neutral"}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          {props.enabled ? "Ativo" : "Inativo"} ·{" "}
          {secretConfigured ? "Segredo configurado" : "Sem segredo"}
        </FeatureStatusBadge>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-muted">
          Webhook URL
          <span className="flex items-center gap-2 rounded-lg border border-line/35 bg-app px-3 py-2">
            <LinkIcon aria-hidden="true" className="size-4 text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-bold normal-case text-app-text outline-none"
              onChange={(event) => props.onWebhookUrlChange(event.target.value)}
              placeholder="https://bot.exemplo.com/webhook"
              type="url"
              value={props.webhookUrl}
            />
          </span>
        </label>

        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-muted">
          Novo segredo
          <span className="flex items-center gap-2 rounded-lg border border-line/35 bg-app px-3 py-2">
            <KeyRound aria-hidden="true" className="size-4 text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-bold normal-case text-app-text outline-none"
              onChange={(event) => props.onSecretChange(event.target.value)}
              placeholder={
                secretConfigured ? "Segredo configurado" : "Minimo 8 caracteres"
              }
              type="password"
              value={props.secretDraft}
            />
          </span>
        </label>

        <label className="flex items-center gap-3 text-sm font-bold text-app-text">
          <input
            checked={props.enabled}
            onChange={(event) => props.onEnabledChange(event.target.checked)}
            type="checkbox"
          />
          Bot habilitado
        </label>

        <div className="flex flex-wrap items-center gap-2">
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
      Seu usuario nao tem permissao para gerenciar integracoes.
    </div>
  );
}
