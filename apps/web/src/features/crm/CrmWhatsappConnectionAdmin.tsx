import { Plug } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappUpdateConnectionInput,
} from "./crmWhatsappTypes";
import { ConnectionInstanceForm } from "./CrmWhatsappConnectionInstanceForm";
import {
  ConnectionOperationalSummary,
  ConnectionStatusCard,
  ConnectionWebhookList,
} from "./CrmWhatsappConnectionAdminParts";

export function CrmWhatsappConnectionAdmin({
  connections,
  disabled = false,
  error,
  isLoading = false,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    instanceId: selected?.externalInstanceId ?? "",
    instanceToken: "",
  });

  useEffect(() => {
    setLocalError(null);
    setDraft({
      instanceId: selected?.externalInstanceId ?? "",
      instanceToken: "",
    });
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

  const copyWebhook = async (endpoint: { type: string; url: string }) => {
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
    if (!selected) return;
    const instanceId = draft.instanceId.trim();
    const instanceToken = draft.instanceToken.trim();
    if (!instanceId || !instanceToken) {
      setLocalError("Informe o ID e o token da instancia ZAPI.");
      return;
    }
    setIsSaving(true);
    setLocalError(null);
    try {
      const saved = await onUpdate(selected.id, {
        instanceCredentials: { instanceId, instanceToken },
      });
      if (saved) {
        setDraft({ instanceId, instanceToken: "" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-label="Conexao" className="crm-whatsapp-connection-admin">
      <header className="crm-whatsapp-connection-header">
        <span>
          <Plug aria-hidden="true" />
        </span>
        <div>
          <strong>Conexao</strong>
          <h2>Status da ZAPI e webhooks</h2>
        </div>
      </header>
      {isLoading ? (
        <p className="crm-whatsapp-connection-empty">
          Carregando conexao WhatsApp.
        </p>
      ) : (
        <>
          {error ? (
            <p className="crm-whatsapp-connection-error">
              {formatApiErrorDisplay(
                error,
                "Nao foi possivel carregar a conexao.",
              )}
            </p>
          ) : null}
          {selected ? (
            <div className="crm-whatsapp-connection-layout">
              {connections.length > 1 ? (
                <label className="crm-whatsapp-connection-selector">
                  Instancia
                  <select
                    className="crm-whatsapp-select"
                    onChange={(event) => setSelectedId(event.target.value)}
                    value={String(selected.id)}
                  >
                    {connections.map((connection) => (
                      <option key={connection.id} value={String(connection.id)}>
                        {connection.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <ConnectionStatusCard
                connection={selected}
                isRefreshing={isRefreshing}
                onRefresh={() => void refresh()}
              />
              <ConnectionInstanceForm
                connection={selected}
                disabled={disabled || isSaving}
                draft={draft}
                isSaving={isSaving}
                onChange={setDraft}
                onSave={() => void saveInstance()}
              />
              <ConnectionOperationalSummary connection={selected} />
              <ConnectionWebhookList
                copiedType={copiedWebhook}
                endpoints={selected.webhookEndpoints ?? []}
                onCopy={(endpoint) => void copyWebhook(endpoint)}
                tokenRequired={Boolean(selected.webhookTokenRequired)}
              />
              {localError ? (
                <p className="crm-whatsapp-connection-error">{localError}</p>
              ) : null}
            </div>
          ) : (
            <p className="crm-whatsapp-connection-empty">
              Nenhuma conexao ZAPI configurada para esta loja.
            </p>
          )}
        </>
      )}
    </section>
  );
}
