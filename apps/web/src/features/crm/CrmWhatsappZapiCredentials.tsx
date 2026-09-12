import { useId } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Wrench } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmCreateConnectionInput } from "./crmConversationTypes";

export type ZapiCredentialsDraft = {
  clientToken: string;
  instanceId: string;
  instanceToken: string;
};

export const emptyCredentials: ZapiCredentialsDraft = {
  clientToken: "",
  instanceId: "",
  instanceToken: "",
};

export type BusyState =
  "code" | "credentials" | "disconnect" | "qr" | "refresh";

export function RepairCredentialsButton({
  busy,
  canRepair,
  enabled,
  onClick,
}: {
  busy: BusyState | null;
  canRepair: boolean;
  enabled: boolean;
  onClick: () => void;
}) {
  if (!enabled) return null;
  return (
    <button
      className="crm-action crm-action-secondary"
      disabled={!canRepair || busy !== null}
      onClick={onClick}
      type="button"
    >
      <Wrench aria-hidden="true" />
      Atualizar credenciais da conexão
    </button>
  );
}

export function buildZapiConnectionInput(
  credentials: ZapiCredentialsDraft,
): CrmCreateConnectionInput {
  return {
    channel: "whatsapp",
    clientToken: credentials.clientToken.trim(),
    instanceId: credentials.instanceId.trim(),
    instanceToken: credentials.instanceToken.trim(),
    provider: "zapi",
  };
}

export function CredentialsStage({
  busy,
  canSubmit,
  credentials,
  error,
  mode = "create",
  onCancel,
  onChange,
  onSave,
  onToggleVisibility,
  showCredentials,
}: {
  busy: BusyState | null;
  canSubmit: boolean;
  credentials: ZapiCredentialsDraft;
  error: string | null;
  mode?: "create" | "repair" | "replacement";
  onCancel?: () => void;
  onChange: (draft: ZapiCredentialsDraft) => void;
  onSave: () => void;
  onToggleVisibility: () => void;
  showCredentials: boolean;
}) {
  const invalid = error?.startsWith("Informe as três") ?? false;
  return (
    <section
      aria-labelledby="zapi-credentials-title"
      className="crm-zapi-credentials"
    >
      <div className="crm-zapi-stage-heading">
        <span>
          <KeyRound aria-hidden="true" />
        </span>
        <div>
          <small>
            {mode === "repair"
              ? "Reparo seguro da conexão existente"
              : mode === "replacement"
                ? "Troca protegida da instância da loja"
                : "Cadastro único e protegido"}
          </small>
          <h4 id="zapi-credentials-title">
            {mode === "repair"
              ? "Atualizar credenciais da Z-API"
              : mode === "replacement"
                ? "Trocar instância desta loja"
                : "Credenciais da instância Z-API"}
          </h4>
          <p>
            O ID, o token da instância e o Client-Token são enviados uma única
            vez, não ficam salvos no navegador e nunca retornam pela API.
          </p>
          {mode === "replacement" ? (
            <p>
              A conexão atual permanece operacional durante a verificação. O
              histórico e a rota da loja serão preservados.
            </p>
          ) : null}
        </div>
        <button
          aria-label={
            showCredentials ? "Ocultar credenciais" : "Mostrar credenciais"
          }
          className="crm-icon-action"
          onClick={onToggleVisibility}
          title={
            showCredentials ? "Ocultar credenciais" : "Mostrar credenciais"
          }
          type="button"
        >
          {showCredentials ? (
            <EyeOff aria-hidden="true" />
          ) : (
            <Eye aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="crm-zapi-credential-fields">
        <CredentialField
          disabled={!canSubmit}
          invalid={invalid}
          label="ID da instância"
          onChange={(value) => onChange({ ...credentials, instanceId: value })}
          showValue={showCredentials}
          value={credentials.instanceId}
        />
        <CredentialField
          disabled={!canSubmit}
          invalid={invalid}
          label="Token da instância"
          onChange={(value) =>
            onChange({ ...credentials, instanceToken: value })
          }
          showValue={showCredentials}
          value={credentials.instanceToken}
        />
        <CredentialField
          disabled={!canSubmit}
          invalid={invalid}
          label="Client-Token"
          onChange={(value) => onChange({ ...credentials, clientToken: value })}
          showValue={showCredentials}
          value={credentials.clientToken}
        />
      </div>
      {error ? (
        <p className="crm-connection-error" role="alert">
          {error}
        </p>
      ) : null}
      {!canSubmit ? (
        <p className="crm-zapi-permission-note">
          Peça a um administrador da loja para cadastrar as credenciais.
        </p>
      ) : null}
      <div className="crm-zapi-inline-actions">
        <button
          className="crm-action crm-action-primary crm-connection-save"
          disabled={busy !== null || !canSubmit}
          onClick={onSave}
          type="button"
        >
          {busy === "credentials" ? (
            <Loader2 aria-hidden="true" className="crm-spin" />
          ) : (
            <KeyRound aria-hidden="true" />
          )}
          {busy === "credentials"
            ? "Salvando"
            : mode === "repair"
              ? "Confirmar novas credenciais"
              : mode === "replacement"
                ? "Confirmar troca da instância"
                : "Salvar credenciais"}
        </button>
        {onCancel ? (
          <button
            className="crm-action crm-action-muted crm-action-secondary"
            disabled={busy !== null}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </section>
  );
}

function CredentialField({
  disabled,
  invalid,
  label,
  onChange,
  showValue,
  value,
}: {
  disabled: boolean;
  invalid: boolean;
  label: string;
  onChange: (value: string) => void;
  showValue: boolean;
  value: string;
}) {
  const inputId = useId();
  return (
    <div className="crm-connection-field crm-zapi-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        aria-invalid={invalid}
        autoComplete="off"
        disabled={disabled}
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        type={showValue ? "text" : "password"}
        value={value}
      />
      <small>Disponível no painel da Z-API, dentro da sua instância.</small>
    </div>
  );
}

export async function runAction<T>({
  action,
  busy,
  fallbackError,
  isCurrent = () => true,
  setBusy,
  setError,
}: {
  action: () => Promise<T | undefined>;
  busy: BusyState;
  fallbackError: string;
  isCurrent?: () => boolean;
  setBusy: (busy: BusyState | null) => void;
  setError: (error: string | null) => void;
}) {
  setBusy(busy);
  setError(null);
  try {
    return await action();
  } catch (caught) {
    if (isCurrent()) setError(formatApiErrorDisplay(caught, fallbackError));
    return undefined;
  } finally {
    if (isCurrent()) setBusy(null);
  }
}
