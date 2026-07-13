import { useCallback, useEffect, useState } from "react";
import { BookOpen, Bot, Loader2, TriangleAlert } from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmWhatsappBotDocs } from "./CrmWhatsappBotDocs";
import { CrmWhatsappProviderEventIssuesPanel } from "./CrmWhatsappProviderEventIssuesPanel";
import type {
  CrmWhatsappBotIntegration,
  CrmWhatsappIntegrationView,
} from "./crmWhatsappIntegrationTypes";
import {
  BotIntegrationForm,
  type CrmWhatsappIntegrationsPageProps,
  PermissionNotice,
} from "./CrmWhatsappIntegrationsPageParts";

const integrationViews = [
  { icon: Bot, label: "Configuracao", value: "configuration" },
  { icon: TriangleAlert, label: "Eventos", value: "events" },
  { icon: BookOpen, label: "Referencia", value: "reference" },
] as const;

export function CrmWhatsappIntegrationsPage({
  api,
  canManage,
  canRead,
  canRetry,
}: CrmWhatsappIntegrationsPageProps) {
  const [activeView, setActiveView] =
    useState<CrmWhatsappIntegrationView>("configuration");
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] =
    useState<CrmWhatsappBotIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [secretDraft, setSecretDraft] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const applyIntegration = useCallback((next: CrmWhatsappBotIntegration) => {
    setEnabled(next.enabled);
    setIntegration(next);
    setWebhookUrl(next.webhookUrl ?? "");
  }, []);

  const refresh = useCallback(async () => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getBotIntegration();
      applyIntegration(response.integration);
    } catch (caught) {
      setError(formatApiErrorDisplay(caught, "Nao foi possivel carregar bot."));
    } finally {
      setIsLoading(false);
    }
  }, [api, applyIntegration, canManage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await api.updateBotIntegration({
        enabled,
        ...(secretDraft.trim() ? { webhookSecret: secretDraft.trim() } : {}),
        webhookUrl: webhookUrl.trim() || null,
      });
      applyIntegration(response.integration);
      setSecretDraft("");
    } catch (caught) {
      setError(formatApiErrorDisplay(caught, "Nao foi possivel salvar bot."));
    } finally {
      setIsSaving(false);
    }
  };

  const clearSecret = async () => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await api.updateBotIntegration({
        enabled: false,
        webhookSecret: null,
        webhookUrl: webhookUrl.trim() || null,
      });
      applyIntegration(response.integration);
      setSecretDraft("");
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Nao foi possivel remover segredo."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="crm-whatsapp-section">
      <div className="crm-whatsapp-integrations-page">
        <div className="crm-whatsapp-integrations-nav">
          <FeatureTabs
            activeClassName="crm-whatsapp-integrations-tab-active"
            ariaLabel="Areas de integracao"
            className="crm-whatsapp-integrations-tabs"
            onChange={setActiveView}
            optionClassName="crm-whatsapp-integrations-tab"
            options={integrationViews}
            value={activeView}
          />
          <span className="crm-whatsapp-integrations-nav-status">
            {integration?.enabled ? "Bot ativo" : "Bot inativo"}
          </span>
        </div>

        {activeView === "configuration" ? (
          <div aria-label="Configuracao do bot" role="tabpanel">
            {isLoading ? (
              <div className="crm-whatsapp-integrations-state" role="status">
                <Loader2 aria-hidden="true" className="animate-spin" />
                Carregando configuracao segura.
              </div>
            ) : canManage ? (
              <BotIntegrationForm
                enabled={enabled}
                integration={integration}
                isSaving={isSaving}
                onClearSecret={() => void clearSecret()}
                onEnabledChange={setEnabled}
                onSave={() => void save()}
                onSecretChange={setSecretDraft}
                onWebhookUrlChange={setWebhookUrl}
                secretDraft={secretDraft}
                webhookUrl={webhookUrl}
              />
            ) : (
              <PermissionNotice />
            )}
            {error ? (
              <p className="crm-whatsapp-integrations-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {activeView === "events" ? (
          <div aria-label="Eventos do provedor" role="tabpanel">
            {canRead ? (
              <CrmWhatsappProviderEventIssuesPanel
                api={api}
                canRetry={canRetry}
                showHealthyState
              />
            ) : (
              <PermissionNotice message="Seu usuário não tem permissão para visualizar eventos do provedor." />
            )}
          </div>
        ) : null}

        {activeView === "reference" ? (
          <div aria-label="Referencia da integracao" role="tabpanel">
            <CrmWhatsappBotDocs />
          </div>
        ) : null}
      </div>
    </section>
  );
}
