import { useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmSelect } from "./CrmFormControls";
import {
  ConnectionDashboard,
  ConnectionSetupFlow,
} from "./CrmWhatsappConnectionViews";
import type {
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
  onUpdate,
  onRefresh,
}: {
  connections: CrmWhatsappProviderConnection[];
  disabled?: boolean;
  embedded?: boolean;
  error?: Error | null;
  isLoading?: boolean;
  onClose?: () => void;
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

  useEffect(() => {
    setLocalError(null);
    setDraft({
      instanceId: selected?.externalInstanceId ?? "",
      instanceToken: "",
    });
    setSetupStep(selected && hasCredentials(selected) ? 1 : 0);
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

  const saveInstance = async () => {
    if (!selected) return false;
    const instanceId = draft.instanceId.trim();
    const instanceToken = draft.instanceToken.trim();
    if (!instanceId || !instanceToken) {
      setLocalError("Informe o ID e o token da instancia ZAPI.");
      return false;
    }
    setIsSaving(true);
    setLocalError(null);
    try {
      const saved = await onUpdate(selected.id, {
        instanceCredentials: { instanceId, instanceToken },
      });
      if (saved) setDraft({ instanceId, instanceToken: "" });
      else setLocalError("Nao foi possivel salvar a instancia ZAPI.");
      return saved;
    } finally {
      setIsSaving(false);
    }
  };

  const advanceSetup = async () => {
    if (!selected) return;
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
              Instancia
              <CrmSelect
                className="crm-whatsapp-select"
                onChange={setSelectedId}
                options={connections.map((connection) => ({
                  label: connection.displayName,
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
              isRefreshing={isRefreshing}
              isSaving={isSaving}
              onCopy={(endpoint) => void copyWebhook(endpoint)}
              onDraftChange={setDraft}
              onRefresh={() => void refresh()}
              onSave={() => void saveInstance()}
            />
          ) : (
            <ConnectionSetupFlow
              connection={selected}
              copiedWebhook={copiedWebhook}
              currentStep={setupStep}
              disabled={disabled}
              draft={draft}
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
              onCopy={(endpoint) => void copyWebhook(endpoint)}
              onDraftChange={setDraft}
              onNext={() => void advanceSetup()}
              onRefresh={() => void refresh()}
              onSave={() => void saveInstance()}
              onStepChange={setSetupStep}
            />
          )}
        </>
      ) : (
        <p className="crm-whatsapp-connection-empty">
          Nenhuma conexao ZAPI configurada para esta loja.
        </p>
      )}
    </section>
  );
}

function hasCredentials(connection: CrmWhatsappProviderConnection) {
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
  if (setupStep === 1) return !(connection.webhookEndpoints?.length ?? 0);
  if (setupStep === 2) return false;
  const unchanged =
    hasCredentials(connection) &&
    draft.instanceId.trim() === connection.externalInstanceId &&
    !draft.instanceToken.trim();
  return disabled || (!unchanged && !(draft.instanceId && draft.instanceToken));
}
