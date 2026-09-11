import { useState } from "react";
import { ArrowRightLeft, KeyRound, Loader2, Plus } from "lucide-react";
import { AppApiError, formatApiErrorDisplay } from "../../lib/apiErrors";
import type {
  CrmConnectionId,
  CrmProviderConnection,
  CrmUazapiCredentialsInput,
  CrmUazapiReplacementInput,
  CrmUazapiReplacementResult,
} from "./crmConversationTypes";

export type RepairUazapiCredentialsHandler = (
  connectionId: CrmConnectionId,
  input: CrmUazapiCredentialsInput,
) => Promise<CrmProviderConnection>;

export type ReplaceUazapiConnectionHandler = (
  connectionId: CrmConnectionId,
  input: CrmUazapiReplacementInput,
) => Promise<CrmUazapiReplacementResult>;

export function CrmUazapiCredentialsRepairSection({
  canManage,
  connection,
  createNewConnectionBlockedReason = null,
  disabled = false,
  onCreateNewConnection,
  onReplace,
  onRepair,
}: {
  canManage: boolean;
  connection: CrmProviderConnection;
  createNewConnectionBlockedReason?: string | null;
  disabled?: boolean;
  onCreateNewConnection?: () => void;
  onReplace?: ReplaceUazapiConnectionHandler;
  onRepair: RepairUazapiCredentialsHandler;
}) {
  const [expanded, setExpanded] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identityMismatch, setIdentityMismatch] = useState(false);

  const readDraft = () => ({
    ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
    instanceId: instanceId.trim(),
    instanceToken: instanceToken.trim(),
  });

  const submit = async () => {
    if (busy) return;
    if (!instanceId.trim() || !instanceToken.trim()) {
      setError("Informe o ID e o token da instância uazapi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRepair(connection.id, {
        ...readDraft(),
        ...(connection.revision !== undefined
          ? { expectedRevision: connection.revision }
          : {}),
      });
      setExpanded(false);
      setIdentityMismatch(false);
      setInstanceToken("");
    } catch (caught) {
      if (
        onReplace &&
        caught instanceof AppApiError &&
        caught.code === "CRM_UAZAPI_IDENTITY_REPLACEMENT_REQUIRES_SUPPORT"
      ) {
        setIdentityMismatch(true);
      }
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível atualizar as credenciais da conexão.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const replace = async () => {
    if (busy || !onReplace) return;
    setBusy(true);
    setError(null);
    try {
      await onReplace(connection.id, {
        ...readDraft(),
        expectedRevision: connection.revision ?? 0,
        idempotencyKey: crypto.randomUUID(),
      });
      setExpanded(false);
      setIdentityMismatch(false);
      setInstanceToken("");
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível trocar a instância desta conexão.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="crm-connection-management-actions">
      <button
        className="crm-action crm-action-secondary"
        disabled={!canManage || disabled || busy}
        onClick={() => {
          setExpanded((current) => !current);
          setError(null);
          setIdentityMismatch(false);
        }}
        type="button"
      >
        <KeyRound aria-hidden="true" />
        Atualizar credenciais da instância
      </button>
      <small>
        Revalida o ID e o token da mesma instância uazapi sem perder o histórico
        do CRM.
      </small>
      {onCreateNewConnection ? (
        <>
          <button
            className="crm-action crm-action-secondary"
            disabled={!canManage || disabled || busy}
            onClick={onCreateNewConnection}
            type="button"
          >
            <Plus aria-hidden="true" />
            Criar nova conexão
          </button>
          <small>
            Abandona este reparo e começa uma conexão do zero, com uma nova
            instância. A conexão atual e todo o histórico do CRM ficam intactos;
            as duas conexões passam a existir lado a lado.
          </small>
        </>
      ) : null}
      {!onCreateNewConnection && createNewConnectionBlockedReason ? (
        <p className="crm-channel-empty" role="note">
          {createNewConnectionBlockedReason}
        </p>
      ) : null}
      {expanded ? (
        <section
          aria-labelledby="uazapi-credentials-repair-title"
          className="crm-zapi-credentials"
        >
          <div className="crm-zapi-stage-heading">
            <span>
              <KeyRound aria-hidden="true" />
            </span>
            <div>
              <small>Reparo seguro da conexão existente</small>
              <h4 id="uazapi-credentials-repair-title">
                Atualizar credenciais da UAZAPI
              </h4>
              <p>
                O ID e o token da instância são enviados uma única vez, não
                ficam salvos no navegador e nunca retornam pela API.
              </p>
            </div>
          </div>
          <div className="crm-zapi-credential-fields">
            <div className="crm-connection-field crm-zapi-field">
              <label htmlFor="uazapi-repair-instance-id">ID da instância</label>
              <input
                autoComplete="off"
                disabled={!canManage || disabled || busy}
                id="uazapi-repair-instance-id"
                onChange={(event) => setInstanceId(event.target.value)}
                spellCheck={false}
                type="password"
                value={instanceId}
              />
              <small>Disponível no painel da uazapi, na sua instância.</small>
            </div>
            <div className="crm-connection-field crm-zapi-field">
              <label htmlFor="uazapi-repair-instance-token">
                Token da instância
              </label>
              <input
                autoComplete="off"
                disabled={!canManage || disabled || busy}
                id="uazapi-repair-instance-token"
                onChange={(event) => setInstanceToken(event.target.value)}
                spellCheck={false}
                type="password"
                value={instanceToken}
              />
              <small>
                Gerado pela uazapi para a instância; substitui o token
                rejeitado.
              </small>
            </div>
            <div className="crm-connection-field crm-zapi-field">
              <label htmlFor="uazapi-repair-base-url">
                URL base da uazapi (opcional)
              </label>
              <input
                autoComplete="off"
                disabled={!canManage || disabled || busy}
                id="uazapi-repair-base-url"
                inputMode="url"
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://free.uazapi.com"
                value={baseUrl}
              />
              <small>
                Preencha apenas se a sua conta usa um endereço próprio.
              </small>
            </div>
          </div>
          {error ? (
            <p className="crm-connection-error" role="alert">
              {error}
            </p>
          ) : null}
          {identityMismatch && onReplace ? (
            <div className="crm-zapi-inline-actions">
              <button
                className="crm-action crm-action-primary crm-connection-save"
                disabled={!canManage || disabled || busy}
                onClick={() => void replace()}
                type="button"
              >
                {busy ? (
                  <Loader2 aria-hidden="true" className="crm-spin" />
                ) : (
                  <ArrowRightLeft aria-hidden="true" />
                )}
                {busy ? "Trocando instância" : "Trocar para a nova instância"}
              </button>
              <small>
                A instância informada é diferente da atual. A troca é verificada
                com o provedor antes de valer e o histórico do CRM é preservado.
              </small>
            </div>
          ) : null}
          <div className="crm-zapi-inline-actions">
            <button
              className="crm-action crm-action-primary crm-connection-save"
              disabled={!canManage || disabled || busy}
              onClick={() => void submit()}
              type="button"
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="crm-spin" />
              ) : (
                <KeyRound aria-hidden="true" />
              )}
              {busy ? "Salvando" : "Confirmar novas credenciais"}
            </button>
            <button
              className="crm-action crm-action-muted crm-action-secondary"
              disabled={busy}
              onClick={() => {
                setExpanded(false);
                setError(null);
                setIdentityMismatch(false);
              }}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
