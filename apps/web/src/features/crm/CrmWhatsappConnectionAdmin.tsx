import { useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmSelect } from "./CrmFormControls";
import {
  ConnectionDashboard,
  ConnectionSetupFlow,
} from "./CrmWhatsappConnectionViews";
import { readCrmWhatsappProviderLabel } from "./crmWhatsappConnectionStatus";
import type {
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappProviderConnection,
  CrmWhatsappUpdateConnectionInput,
  CrmWhatsappWebhookEndpoint,
} from "./crmWhatsappTypes";

export function CrmWhatsappConnectionAdmin({
  connections,
  disabled = false,
  error,
  isLoading = false,
  onClose,
  onConfigureWebhooks,
  onUpdate,
  onRefresh,
}: {
  connections: CrmWhatsappProviderConnection[];
  disabled?: boolean;
  embedded?: boolean;
  error?: Error | null;
  isLoading?: boolean;
  onClose?: () => void;
  onConfigureWebhooks: (
    connectionId: CrmWhatsappProviderConnection["id"],
  ) => Promise<CrmWhatsappConfigureWebhooksResult | null>;
  onRefresh: () => Promise<void>;
  onUpdate: (
    connectionId: CrmWhatsappProviderConnection["id"],
    input: CrmWhatsappUpdateConnectionInput,
  ) => Promise<boolean>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    connections[0]?.id ? String(connections[0].id) : null,
  );
  const selected = useMemo(
    () =>
      connections.find((connection) => String(connection.id) === selectedId) ??
      connections[0] ??
      null,
    [connections, selectedId],
  );
  const [setupStep, setSetupStep] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [draft, setDraft] = useState({ instanceId: "", instanceToken: "" });
  const [isConfiguringWebhooks, setIsConfiguringWebhooks] = useState(false);
  const [webhookConfigResult, setWebhookConfigResult] =
    useState<CrmWhatsappConfigureWebhooksResult | null>(null);

  useEffect(() => {
    setLocalError(null);
    setDraft({
      instanceId:
        selected?.provider === "zapi"
          ? (selected.externalInstanceId ?? "")
          : "",
      instanceToken: "",
    });
    setWebhookConfigResult(null);
    setSetupStep(
      selected?.provider === "zapi" && hasCredentials(selected) ? 1 : 0,
    );
  }, [selected]);

  useEffect(() => {
    if (
      selectedId &&
      connections.some((item) => String(item.id) === selectedId)
    ) {
      return;
    }
    setSelectedId(connections[0]?.id ? String(connections[0].id) : null);
  }, [connections, selectedId]);

  const copyWebhook = async (endpoint: CrmWhatsappWebhookEndpoint) => {
    await navigator.clipboard?.writeText(endpoint.url);
    setCopiedWebhook(endpoint.type);
    window.setTimeout(() => setCopiedWebhook(null), 1600);
  };

  const refresh = async () => {
    setIsRefreshing(true);
    setLocalError(null);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const configureWebhooks = async () => {
    if (!selected || selected.provider !== "zapi") return;
    setIsConfiguringWebhooks(true);
    try {
      const result = await onConfigureWebhooks(selected.id);
      setWebhookConfigResult(result);
      if (!result) {
        setLocalError("Nao foi possivel configurar os webhooks na Z-API.");
      }
    } finally {
      setIsConfiguringWebhooks(false);
    }
  };

  const saveInstance = async () => {
    if (!selected || selected.provider !== "zapi") return false;
    const instanceId = draft.instanceId.trim();
    const instanceToken = draft.instanceToken.trim();
    if (!instanceId || !instanceToken) {
      setLocalError("Informe o ID e o token da instancia Z-API.");
      return false;
    }
    setIsSaving(true);
    setLocalError(null);
    try {
      const saved = await onUpdate(selected.id, {
        instanceCredentials: { instanceId, instanceToken },
      });
      if (saved) {
        setDraft({ instanceId, instanceToken: "" });
        // Auto-register the Z-API webhooks as soon as credentials are stored.
        void configureWebhooks();
      } else setLocalError("Nao foi possivel salvar a instancia Z-API.");
      return saved;
    } finally {
      setIsSaving(false);
    }
  };

  const advanceSetup = async () => {
    if (!selected) return;
    if (selected.provider !== "zapi") {
      await refresh();
      return;
    }
    if (setupStep === 0) {
      const unchanged =
        hasCredentials(selected) &&
        draft.instanceId.trim() === selected.externalInstanceId &&
        !draft.instanceToken.trim();
      if (unchanged || (await saveInstance())) setSetupStep(1);
      return;
    }
    if (setupStep === 1) {
      setSetupStep(2);
      return;
    }
    await refresh();
  };

  if (isLoading) {
    return (
      <p className="crm-whatsapp-connection-empty" role="status">
        Carregando conexao WhatsApp.
      </p>
    );
  }

  return (
    <section aria-label="Conexao" className="crm-whatsapp-connection-admin">
      {error ? (
        <p className="crm-whatsapp-connection-error" role="alert">
          {formatApiErrorDisplay(error, "Nao foi possivel carregar a conexao.")}
        </p>
      ) : null}
      {selected ? (
        <>
          {connections.length > 1 ? (
            <label className="crm-whatsapp-connection-selector">
              Canal
              <CrmSelect
                className="crm-whatsapp-select"
                onChange={setSelectedId}
                options={connections.map((connection) => ({
                  label: `${connection.displayName} · ${readCrmWhatsappProviderLabel(connection.provider)}`,
                  value: String(connection.id),
                }))}
                value={String(selected.id)}
              />
            </label>
          ) : null}
          {selected.live.providerStatus === "connected" ? (
            <ConnectionDashboard
              connection={selected}
              copiedWebhook={copiedWebhook}
              disabled={disabled}
              draft={draft}
              isConfiguringWebhooks={isConfiguringWebhooks}
              isRefreshing={isRefreshing}
              isSaving={isSaving}
              onConfigureWebhooks={() => void configureWebhooks()}
              onCopy={(endpoint) => void copyWebhook(endpoint)}
              onDraftChange={setDraft}
              onRefresh={() => void refresh()}
              onSave={() => void saveInstance()}
              webhookConfigResult={webhookConfigResult}
            />
          ) : (
            <ConnectionSetupFlow
              connection={selected}
              copiedWebhook={copiedWebhook}
              currentStep={setupStep}
              disabled={disabled}
              draft={draft}
              isConfiguringWebhooks={isConfiguringWebhooks}
              isRefreshing={isRefreshing}
              isSaving={isSaving}
              localError={localError}
              nextDisabled={readNextDisabled({
                connection: selected,
                disabled,
                draft,
                setupStep,
              })}
              onCancel={() => onClose?.()}
              onConfigureWebhooks={() => void configureWebhooks()}
              onCopy={(endpoint) => void copyWebhook(endpoint)}
              onDraftChange={setDraft}
              onNext={() => void advanceSetup()}
              onRefresh={() => void refresh()}
              onSave={() => void saveInstance()}
              onStepChange={setSetupStep}
              webhookConfigResult={webhookConfigResult}
            />
          )}
        </>
      ) : (
        <p className="crm-whatsapp-connection-empty">
          Nenhuma conexao de mensagens configurada para esta loja.
        </p>
      )}
    </section>
  );
}

function hasCredentials(connection: CrmWhatsappProviderConnection) {
  if (connection.provider !== "zapi") {
    return Boolean(connection.credentials?.composioConnectedAccountConfigured);
  }
  return Boolean(
    connection.credentials?.storedInstanceConfigured ||
    (connection.credentials?.instanceIdEnv &&
      connection.credentials.instanceTokenEnv),
  );
}

function readNextDisabled({
  connection,
  disabled,
  draft,
  setupStep,
}: {
  connection: CrmWhatsappProviderConnection;
  disabled: boolean;
  draft: { instanceId: string; instanceToken: string };
  setupStep: number;
}) {
  if (connection.provider !== "zapi") return false;
  if (setupStep === 1) return !(connection.webhookEndpoints?.length ?? 0);
  if (setupStep === 2) return false;
  const unchanged =
    hasCredentials(connection) &&
    draft.instanceId.trim() === connection.externalInstanceId &&
    !draft.instanceToken.trim();
  return disabled || (!unchanged && !(draft.instanceId && draft.instanceToken));
}
