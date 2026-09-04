import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Bot, Loader2, TriangleAlert } from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import type { CrmExternalBotConfiguration } from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmExternalBotDocs } from "./CrmExternalBotDocs";
import { CrmProviderEventIssuesPanel } from "./CrmProviderEventIssuesPanel";
import type { CrmExternalBotView } from "./crmExternalBotView";
import type { CrmRoutingChannel, CrmRoutingPolicy } from "./crmRoutingTypes";
import { CrmExternalBotPolicyOverview } from "./CrmExternalBotPolicyOverview";
import {
  peekCrmScopedCache,
  CRM_EXTERNAL_BOT_CACHE_KEY,
  writeCrmScopedCache,
} from "./crmScopedCache";
import {
  BotIntegrationForm,
  type CrmExternalBotPageProps,
  PermissionNotice,
} from "./CrmExternalBotPageParts";

const integrationViews = [
  { icon: Bot, label: "Configuracao", value: "configuration" },
  { icon: TriangleAlert, label: "Eventos", value: "events" },
  { icon: BookOpen, label: "Referencia", value: "reference" },
] as const;

export function CrmExternalBotPage({
  api,
  canManage,
  canRead,
  canRetry,
}: CrmExternalBotPageProps) {
  const [activeView, setActiveView] =
    useState<CrmExternalBotView>("configuration");
  const [initialIntegration] = useState(() =>
    peekCrmScopedCache<CrmExternalBotConfiguration>(
      api,
      CRM_EXTERNAL_BOT_CACHE_KEY,
    ),
  );
  const [enabled, setEnabled] = useState(initialIntegration?.enabled ?? false);
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] =
    useState<CrmExternalBotConfiguration | null>(initialIntegration ?? null);
  const hasIntegrationDataRef = useRef(initialIntegration !== undefined);
  const [isLoading, setIsLoading] = useState(initialIntegration === undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [secretDraft, setSecretDraft] = useState("");
  const [webhookUrl, setWebhookUrl] = useState(
    initialIntegration?.webhookUrl ?? "",
  );
  const [activeChannel, setActiveChannel] =
    useState<CrmRoutingChannel>("whatsapp");
  const [routingPolicy, setRoutingPolicy] = useState<CrmRoutingPolicy | null>(
    null,
  );

  const applyIntegration = useCallback((next: CrmExternalBotConfiguration) => {
    setEnabled(next.enabled);
    setIntegration(next);
    setWebhookUrl(next.webhookUrl ?? "");
  }, []);

  const refresh = useCallback(async () => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }
    if (!hasIntegrationDataRef.current) setIsLoading(true);
    setError(null);
    try {
      const response = await api.getBotIntegration();
      hasIntegrationDataRef.current = true;
      writeCrmScopedCache(
        api,
        CRM_EXTERNAL_BOT_CACHE_KEY,
        response.configuration,
      );
      applyIntegration(response.configuration);
      if (typeof api.getRoutingPolicy === "function") {
        try {
          setRoutingPolicy(await api.getRoutingPolicy());
        } catch {
          setRoutingPolicy(null);
        }
      }
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
      applyIntegration(response.configuration);
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
      applyIntegration(response.configuration);
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
    <section className="crm-section">
      <div className="crm-integrations-page">
        <div className="crm-integrations-nav">
          <FeatureTabs
            activeClassName="crm-integrations-tab-active"
            ariaLabel="Areas de integracao"
            className="crm-integrations-tabs"
            onChange={setActiveView}
            optionClassName="crm-integrations-tab"
            options={integrationViews}
            value={activeView}
          />
          <span className="crm-integrations-nav-status">
            {integration?.enabled ? "Bot ativo" : "Bot inativo"}
          </span>
        </div>

        {activeView === "configuration" ? (
          <div aria-label="Configuracao do bot" role="tabpanel">
            {isLoading ? (
              <div className="crm-integrations-state" role="status">
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
            <CrmExternalBotPolicyOverview
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
              policy={routingPolicy}
            />
            {error ? (
              <p className="crm-integrations-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {activeView === "events" ? (
          <div aria-label="Eventos do provedor" role="tabpanel">
            {canRead ? (
              <CrmProviderEventIssuesPanel
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
            <CrmExternalBotDocs />
          </div>
        ) : null}
      </div>
    </section>
  );
}
