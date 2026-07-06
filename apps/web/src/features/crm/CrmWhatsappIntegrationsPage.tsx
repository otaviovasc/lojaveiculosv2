import { useCallback, useEffect, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmWhatsappProviderEventIssuesPanel } from "./CrmWhatsappProviderEventIssuesPanel";
import type { CrmWhatsappBotIntegration } from "./crmWhatsappIntegrationTypes";
import {
  BotIntegrationForm,
  type CrmWhatsappIntegrationsPageProps,
  PermissionNotice,
} from "./CrmWhatsappIntegrationsPageParts";

export function CrmWhatsappIntegrationsPage({
  api,
  canManage,
  canRead,
  canRetry,
}: CrmWhatsappIntegrationsPageProps) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] =
    useState<CrmWhatsappBotIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [secretDraft, setSecretDraft] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

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
  }, [api, canManage]);

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

  const applyIntegration = (next: CrmWhatsappBotIntegration) => {
    setEnabled(next.enabled);
    setIntegration(next);
    setWebhookUrl(next.webhookUrl ?? "");
  };

  return (
    <section className="crm-whatsapp-section">
      <div className="grid gap-4">
        {canManage ? (
          <BotIntegrationForm
            enabled={enabled}
            integration={integration}
            isSaving={isLoading || isSaving}
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
          <p className="text-sm font-black text-danger">{error}</p>
        ) : null}

        {canRead ? (
          <CrmWhatsappProviderEventIssuesPanel api={api} canRetry={canRetry} />
        ) : null}
      </div>
    </section>
  );
}
