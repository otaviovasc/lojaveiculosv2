import { useState } from "react";
import { Loader2, ServerCog } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { CrmSelect } from "./CrmFormControls";
import type {
  CrmProviderConnection,
  CrmUazapiInstanceSummary,
  CrmUazapiListInstancesInput,
} from "./crmConversationTypes";
import { readUazapiInstanceOptionLabel } from "./CrmWhatsappUazapiSetupParts";
import type { ReplaceUazapiConnectionHandler } from "./CrmWhatsappUazapiCredentials";

/**
 * Admin-token replacement path: the store pastes its uazapi admin token
 * (write-only, never read back), the server lists the account instances and
 * the user picks one — or lets the provider create a fresh instance — and the
 * existing CRM connection is re-pointed without touching its history.
 */
export function CrmUazapiAdminReplacementSection({
  canManage,
  connection,
  disabled = false,
  onListInstances,
  onReplace,
}: {
  canManage: boolean;
  connection: CrmProviderConnection;
  disabled?: boolean;
  onListInstances: (
    input: CrmUazapiListInstancesInput,
  ) => Promise<readonly CrmUazapiInstanceSummary[]>;
  onReplace: ReplaceUazapiConnectionHandler;
}) {
  const [adminToken, setAdminToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState<"list" | "replace" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instances, setInstances] = useState<
    readonly CrmUazapiInstanceSummary[] | null
  >(null);
  const [mode, setMode] = useState<"attach" | "create">("create");
  const [selectedInstanceId, setSelectedInstanceId] = useState<
    string | undefined
  >(undefined);

  const readDraft = () => ({
    adminToken: adminToken.trim(),
    ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
  });

  const listInstances = async () => {
    if (busy) return;
    if (!adminToken.trim()) {
      setError("Informe o token admin da conta uazapi.");
      return;
    }
    setBusy("list");
    setError(null);
    try {
      const listed = await onListInstances(readDraft());
      setInstances(listed);
      setMode(listed.length > 0 ? "attach" : "create");
      setSelectedInstanceId(undefined);
    } catch (caught) {
      setInstances(null);
      setError(
        formatApiErrorDisplay(
          caught,
          "A uazapi não confirmou o token admin. Nenhuma instância foi alterada.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmReplacement = async () => {
    if (busy) return;
    if (mode === "attach" && !selectedInstanceId) {
      setError("Selecione a instância existente que receberá esta conexão.");
      return;
    }
    setBusy("replace");
    setError(null);
    try {
      await onReplace(connection.id, {
        ...readDraft(),
        ...(mode === "create"
          ? { createInstance: {} }
          : { instanceId: selectedInstanceId ?? "" }),
        expectedRevision: connection.revision ?? 0,
        idempotencyKey: crypto.randomUUID(),
      });
      setAdminToken("");
      setInstances(null);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível trocar a instância desta conexão.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const controlsDisabled = !canManage || disabled || busy !== null;

  return (
    <div className="crm-zapi-credential-fields">
      <div className="crm-connection-field crm-zapi-field">
        <label htmlFor="uazapi-replace-admin-token">Token admin da conta</label>
        <input
          autoComplete="off"
          disabled={controlsDisabled}
          id="uazapi-replace-admin-token"
          onChange={(event) => setAdminToken(event.target.value)}
          spellCheck={false}
          type="password"
          value={adminToken}
        />
        <small>
          Enviado uma única vez para listar e criar instâncias; nunca retorna
          pela API nem fica salvo no navegador.
        </small>
      </div>
      <div className="crm-connection-field crm-zapi-field">
        <label htmlFor="uazapi-replace-base-url">
          URL base da uazapi (opcional)
        </label>
        <input
          autoComplete="off"
          disabled={controlsDisabled}
          id="uazapi-replace-base-url"
          inputMode="url"
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://free.uazapi.com"
          value={baseUrl}
        />
        <small>Preencha apenas se a sua conta usa um endereço próprio.</small>
      </div>
      {instances === null ? (
        <div className="crm-zapi-inline-actions">
          <button
            className="crm-action crm-action-secondary"
            disabled={controlsDisabled}
            onClick={() => void listInstances()}
            type="button"
          >
            {busy === "list" ? (
              <Loader2 aria-hidden="true" className="crm-spin" />
            ) : (
              <ServerCog aria-hidden="true" />
            )}
            {busy === "list"
              ? "Consultando a conta"
              : "Buscar instâncias da conta"}
          </button>
        </div>
      ) : (
        <>
          {instances.length > 0 ? (
            <fieldset className="crm-connection-field">
              <legend>Origem da nova instância</legend>
              <label>
                <input
                  checked={mode === "attach"}
                  disabled={controlsDisabled}
                  name="uazapi-replace-instance-mode"
                  onChange={() => setMode("attach")}
                  type="radio"
                  value="attach"
                />{" "}
                Usar instância existente
              </label>
              <label>
                <input
                  checked={mode === "create"}
                  disabled={controlsDisabled}
                  name="uazapi-replace-instance-mode"
                  onChange={() => setMode("create")}
                  type="radio"
                  value="create"
                />{" "}
                Criar nova instância
              </label>
            </fieldset>
          ) : (
            <p className="crm-zapi-permission-note">
              Nenhuma instância foi encontrada nesta conta uazapi. Uma nova
              instância será criada pela uazapi ao confirmar.
            </p>
          )}
          {mode === "attach" && instances.length > 0 ? (
            <div className="crm-connection-field">
              <CrmSelect
                ariaLabel="Instância uazapi existente"
                disabled={controlsDisabled}
                onChange={setSelectedInstanceId}
                options={instances.map((instance) => ({
                  label: readUazapiInstanceOptionLabel(instance),
                  value: instance.id,
                }))}
                placeholder="Selecione a instância"
                value={selectedInstanceId}
              />
            </div>
          ) : null}
          <div className="crm-zapi-inline-actions">
            <button
              className="crm-action crm-action-primary crm-connection-save"
              disabled={controlsDisabled}
              onClick={() => void confirmReplacement()}
              type="button"
            >
              {busy === "replace" ? (
                <Loader2 aria-hidden="true" className="crm-spin" />
              ) : null}
              {busy === "replace"
                ? "Trocando instância"
                : "Confirmar troca de instância"}
            </button>
            <small>
              A troca é verificada com o provedor antes de valer. A conexão
              atual e o histórico do CRM são preservados.
            </small>
          </div>
        </>
      )}
      {error ? (
        <p className="crm-connection-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
