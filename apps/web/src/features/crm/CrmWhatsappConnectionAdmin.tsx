import { KeyRound, Plug, Save, ServerCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type {
  CrmWhatsappConnectionConfiguredStatus,
  CrmWhatsappConnectionId,
  CrmWhatsappProviderConnection,
  CrmWhatsappUpdateConnectionInput,
} from "./crmWhatsappTypes";
import {
  ConnectionSectionCard,
  ConnectionStatusCard,
  ConnectionWebhookList,
  createConnectionDraft,
  statusOptions,
  TextField,
  toConnectionUpdateInput,
  type ConnectionDraft,
} from "./CrmWhatsappConnectionAdminParts";

export function CrmWhatsappConnectionAdmin({
  connections,
  disabled,
  error,
  isLoading = false,
  onRefresh,
  onUpdate,
}: {
  connections: CrmWhatsappProviderConnection[];
  disabled?: boolean;
  embedded?: boolean;
  error?: Error | null;
  isLoading?: boolean;
  onClose?: () => void;
  onRefresh: () => Promise<void>;
  onUpdate: (
    connectionId: CrmWhatsappConnectionId,
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
  const [draft, setDraft] = useState<ConnectionDraft>(() =>
    createConnectionDraft(selected),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

  useEffect(() => {
    setDraft(createConnectionDraft(selected));
    setLocalError(null);
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

  const save = async () => {
    if (!selected || disabled || isSaving) return;
    if (!draft.displayName.trim()) {
      setLocalError("Nome da conexao e obrigatorio.");
      return;
    }
    const input = toConnectionUpdateInput(draft);
    if (!input) {
      setLocalError("Preencha todas as referencias de env da ZAPI.");
      return;
    }
    setIsSaving(true);
    setLocalError(null);
    try {
      const accepted = await onUpdate(selected.id, input);
      if (!accepted) setLocalError("Nao foi possivel salvar a conexao ZAPI.");
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <section aria-label="Conexao" className="crm-whatsapp-connection-admin">
      <header className="crm-whatsapp-connection-header">
        <span>
          <Plug aria-hidden="true" />
        </span>
        <div>
          <strong>Conexao</strong>
          <h2>Instancia, credenciais e webhooks</h2>
        </div>
        <button
          className="crm-action"
          disabled={!selected || disabled || isSaving}
          onClick={() => void save()}
          type="button"
        >
          <Save aria-hidden="true" />
          {isSaving ? "Salvando" : "Salvar conexao"}
        </button>
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
          {disabled ? (
            <p className="crm-whatsapp-connection-disabled">
              Seu usuario nao tem permissao para editar a conexao. Os dados
              abaixo estao em modo leitura.
            </p>
          ) : null}
          {selected ? (
            <div className="crm-whatsapp-connection-layout">
              {connections.length > 1 ? (
                <label className="crm-whatsapp-connection-selector">
                  Instancia
                  <select
                    className="crm-whatsapp-select"
                    disabled={disabled || isSaving}
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
                disabled={Boolean(disabled)}
                isRefreshing={isRefreshing}
                onRefresh={() => void refresh()}
              />
              <ConnectionSectionCard
                description="Metadados da instancia ZAPI usados pelo atendimento e pelos envios comerciais."
                icon={<ServerCog aria-hidden="true" />}
                title="Metadados da instancia"
              >
                <div className="crm-whatsapp-action-grid">
                  <TextField
                    disabled={disabled || isSaving}
                    label="Nome"
                    onChange={(displayName) =>
                      setDraft((current) => ({ ...current, displayName }))
                    }
                    value={draft.displayName}
                  />
                  <label>
                    Status V2
                    <select
                      className="crm-whatsapp-select"
                      disabled={disabled || isSaving}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          status: event.target
                            .value as CrmWhatsappConnectionConfiguredStatus,
                        }))
                      }
                      value={draft.status}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField
                    disabled={disabled || isSaving}
                    label="Telefone"
                    onChange={(phone) =>
                      setDraft((current) => ({ ...current, phone }))
                    }
                    value={draft.phone}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="Webhook base"
                    onChange={(webhookUrl) =>
                      setDraft((current) => ({ ...current, webhookUrl }))
                    }
                    placeholder="https://ngrok.example"
                    value={draft.webhookUrl}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="Catalog phone"
                    onChange={(catalogPhone) =>
                      setDraft((current) => ({ ...current, catalogPhone }))
                    }
                    value={draft.catalogPhone}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="Connected phone"
                    onChange={(connectedPhone) =>
                      setDraft((current) => ({ ...current, connectedPhone }))
                    }
                    value={draft.connectedPhone}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="External connection id"
                    onChange={(externalConnectionId) =>
                      setDraft((current) => ({
                        ...current,
                        externalConnectionId,
                      }))
                    }
                    value={draft.externalConnectionId}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="External instance id"
                    onChange={(externalInstanceId) =>
                      setDraft((current) => ({
                        ...current,
                        externalInstanceId,
                      }))
                    }
                    value={draft.externalInstanceId}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="Purpose"
                    onChange={(purpose) =>
                      setDraft((current) => ({ ...current, purpose }))
                    }
                    value={draft.purpose}
                  />
                </div>
              </ConnectionSectionCard>
              <ConnectionSectionCard
                description="Salve apenas os nomes das variaveis de ambiente. Tokens e segredos nao aparecem na API nem no navegador."
                icon={<KeyRound aria-hidden="true" />}
                title="Referencias de credenciais"
              >
                <div className="crm-whatsapp-action-grid">
                  <TextField
                    disabled={disabled || isSaving}
                    label="API base env"
                    onChange={(apiBaseUrlEnv) =>
                      setDraft((current) => ({ ...current, apiBaseUrlEnv }))
                    }
                    value={draft.apiBaseUrlEnv}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="Instance id env"
                    onChange={(instanceIdEnv) =>
                      setDraft((current) => ({ ...current, instanceIdEnv }))
                    }
                    value={draft.instanceIdEnv}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="Instance token env"
                    onChange={(instanceTokenEnv) =>
                      setDraft((current) => ({ ...current, instanceTokenEnv }))
                    }
                    value={draft.instanceTokenEnv}
                  />
                  <TextField
                    disabled={disabled || isSaving}
                    label="Client token env"
                    onChange={(clientTokenEnv) =>
                      setDraft((current) => ({ ...current, clientTokenEnv }))
                    }
                    value={draft.clientTokenEnv}
                  />
                </div>
              </ConnectionSectionCard>
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
