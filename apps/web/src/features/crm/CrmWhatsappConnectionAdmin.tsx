import { Plug, RefreshCw, Save, ShieldCheck, Webhook, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  CrmWhatsappConnectionConfiguredStatus,
  CrmWhatsappConnectionId,
  CrmWhatsappProviderConnection,
  CrmWhatsappUpdateConnectionInput,
} from "./crmWhatsappTypes";
import {
  createConnectionDraft,
  readProviderStatus,
  statusOptions,
  TextField,
  toConnectionUpdateInput,
  type ConnectionDraft,
} from "./CrmWhatsappConnectionAdminParts";

export function CrmWhatsappConnectionAdmin({
  connections,
  disabled,
  embedded = false,
  onClose,
  onRefresh,
  onUpdate,
}: {
  connections: CrmWhatsappProviderConnection[];
  disabled?: boolean;
  embedded?: boolean;
  onClose: () => void;
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

  useEffect(() => {
    setDraft(createConnectionDraft(selected));
    setLocalError(null);
  }, [selected]);

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
    <div
      aria-label="Conexao ZAPI"
      aria-modal={embedded ? undefined : true}
      className={
        embedded
          ? "crm-whatsapp-action-dialog crm-whatsapp-action-embedded"
          : "crm-whatsapp-action-dialog"
      }
      role={embedded ? "region" : "dialog"}
    >
      <div className="crm-whatsapp-action-panel crm-whatsapp-connection-admin">
        <header>
          <span>
            <Plug />
          </span>
          <h2>Conexao ZAPI</h2>
          {embedded ? null : (
            <button
              aria-label="Fechar"
              className="crm-icon-action"
              onClick={onClose}
              type="button"
            >
              <X />
            </button>
          )}
        </header>
        {selected ? (
          <div className="crm-whatsapp-action-fields">
            {connections.length > 1 ? (
              <label>
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
            <section className="crm-whatsapp-connection-status-card">
              <ShieldCheck aria-hidden="true" />
              <strong>{readProviderStatus(selected)}</strong>
              <span>{selected.live.connectedPhone ?? selected.phone}</span>
              <button
                className="crm-action crm-action-muted"
                disabled={disabled || isRefreshing}
                onClick={() => void refresh()}
                type="button"
              >
                <RefreshCw aria-hidden="true" />
                Atualizar status
              </button>
            </section>
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
            </div>
            <div className="crm-whatsapp-action-grid">
              <TextField
                disabled={disabled || isSaving}
                label="External connection id"
                onChange={(externalConnectionId) =>
                  setDraft((current) => ({ ...current, externalConnectionId }))
                }
                value={draft.externalConnectionId}
              />
              <TextField
                disabled={disabled || isSaving}
                label="External instance id"
                onChange={(externalInstanceId) =>
                  setDraft((current) => ({ ...current, externalInstanceId }))
                }
                value={draft.externalInstanceId}
              />
            </div>
            <TextField
              disabled={disabled || isSaving}
              label="Purpose"
              onChange={(purpose) =>
                setDraft((current) => ({ ...current, purpose }))
              }
              value={draft.purpose}
            />
            <section className="crm-whatsapp-connection-env">
              <h3>Referencias de credenciais</h3>
              <p>
                Salve nomes de variaveis de ambiente. Valores secretos ficam
                fora da API e do navegador.
              </p>
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
            </section>
            <section className="crm-whatsapp-webhook-list">
              <h3>
                <Webhook aria-hidden="true" />
                Webhooks ZAPI
              </h3>
              {selected.webhookTokenRequired ? (
                <p>
                  Token obrigatorio: configure no header x-crm-webhook-token.
                </p>
              ) : null}
              {selected.webhookEndpoints?.map((endpoint) => (
                <label key={endpoint.type}>
                  {endpoint.label}
                  <input readOnly value={endpoint.url} />
                </label>
              ))}
            </section>
            {localError ? (
              <p className="crm-whatsapp-connection-error">{localError}</p>
            ) : null}
          </div>
        ) : (
          <p className="crm-whatsapp-connection-empty">
            Nenhuma conexao ZAPI configurada para esta loja.
          </p>
        )}
        <footer>
          {embedded ? null : (
            <button
              className="crm-action crm-action-muted"
              onClick={onClose}
              type="button"
            >
              Fechar
            </button>
          )}
          <button
            className="crm-action"
            disabled={!selected || disabled || isSaving}
            onClick={() => void save()}
            type="button"
          >
            <Save aria-hidden="true" />
            Salvar conexao
          </button>
        </footer>
      </div>
    </div>
  );
}
