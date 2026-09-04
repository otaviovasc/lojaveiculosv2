import {
  CheckCircle2,
  Loader2,
  ServerCog,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState, type ComponentProps } from "react";
import { formatBrazilianWhatsappPhone } from "../../lib/masks";
import type {
  CrmProviderConnection,
  CrmUazapiInstanceSummary,
} from "./crmConversationTypes";
import { CrmSelect } from "./CrmFormControls";
import type { BusyState } from "./CrmWhatsappZapiCredentials";
import type { PairingBlock } from "./CrmWhatsappUazapiSetupTypes";
import {
  CrmWhatsappPairingStage,
  WebhookStatusList,
  WhatsappSetupProgress,
  WhatsappWebhookSetupStatus,
  type WhatsappPairingCopy,
  type WhatsappPairingMethod,
  type WhatsappSetupStep,
  type WhatsappSetupStepLabel,
  type WhatsappWebhookSetupStatusProps,
} from "./CrmWhatsappSetupParts.shared";

export type UazapiSetupStep = WhatsappSetupStep;

const uazapiStepLabels: ReadonlyArray<WhatsappSetupStepLabel> = [
  { label: "Provisionamento", step: 1 },
  { label: "Configuração", step: 2 },
  { label: "Pareamento", step: 3 },
  { label: "Pronto", step: 4 },
];

export type UazapiProvisionMode = "attach" | "create";

export type UazapiProvisionDraft = {
  adminToken: string;
  baseUrl: string;
  displayName: string;
  phone: string;
};

export const emptyUazapiProvisionDraft: UazapiProvisionDraft = {
  adminToken: "",
  baseUrl: "",
  displayName: "",
  phone: "",
};

export function readUazapiSetupStep({
  connection,
}: {
  connection: CrmProviderConnection | null;
}): UazapiSetupStep {
  if (!connection) return 1;
  if (connection.setup && connection.setup.status !== "configured") return 2;
  if (
    connection.live?.providerStatus === "disconnected" ||
    connection.live?.providerStatus === "error"
  ) {
    return 3;
  }
  if (connection.readiness) return connection.readiness.ready ? 4 : 3;
  if (
    connection.ready !== true ||
    connection.live?.providerStatus !== "connected"
  ) {
    return 3;
  }
  return 4;
}

export function UazapiSetupProgress({ step }: { step: UazapiSetupStep }) {
  return (
    <WhatsappSetupProgress
      ariaLabel="Progresso da configuração UAZAPI"
      step={step}
      stepLabels={uazapiStepLabels}
    />
  );
}

export function UazapiAccountStage({
  busy,
  canSubmit,
  draft,
  error,
  onChange,
  onValidate,
}: {
  busy: BusyState | null;
  canSubmit: boolean;
  draft: UazapiProvisionDraft;
  error: string | null;
  onChange: (draft: UazapiProvisionDraft) => void;
  onValidate: () => void;
}) {
  return (
    <section
      aria-labelledby="uazapi-account-title"
      className="crm-zapi-credentials"
    >
      <div className="crm-zapi-stage-heading">
        <span>
          <ShieldCheck aria-hidden="true" />
        </span>
        <div>
          <small>Conta uazapi</small>
          <h4 id="uazapi-account-title">Conecte a conta uazapi da loja</h4>
          <p>
            O token admin provisiona e gerencia as instâncias de WhatsApp na
            conta uazapi da sua loja. Ele é armazenado criptografado por conexão
            e nunca é exibido novamente.
          </p>
        </div>
      </div>
      <div className="crm-zapi-credential-fields">
        <div className="crm-connection-field">
          <label htmlFor="uazapi-admin-token">Token admin da uazapi</label>
          <input
            autoComplete="off"
            disabled={!canSubmit}
            id="uazapi-admin-token"
            onChange={(event) =>
              onChange({ ...draft, adminToken: event.target.value })
            }
            placeholder="Cole o token admin da sua conta uazapi"
            type="password"
            value={draft.adminToken}
          />
          <small>
            Credencial somente de escrita: o servidor valida e guarda o token,
            que nunca volta a ser exibido.
          </small>
        </div>
        <div className="crm-connection-field">
          <label htmlFor="uazapi-base-url">URL base da uazapi (opcional)</label>
          <input
            autoComplete="off"
            disabled={!canSubmit}
            id="uazapi-base-url"
            inputMode="url"
            onChange={(event) =>
              onChange({ ...draft, baseUrl: event.target.value })
            }
            placeholder="https://free.uazapi.com"
            value={draft.baseUrl}
          />
          <small>Preencha apenas se a sua conta usa um endereço próprio.</small>
        </div>
      </div>
      {error ? (
        <p className="crm-connection-error" role="alert">
          {error}
        </p>
      ) : null}
      {!canSubmit ? (
        <p className="crm-zapi-permission-note">
          Peça a um administrador da loja para provisionar a conexão.
        </p>
      ) : null}
      <div className="crm-zapi-inline-actions">
        <button
          className="crm-action crm-action-primary crm-connection-save"
          disabled={busy !== null || !canSubmit}
          onClick={onValidate}
          type="button"
        >
          {busy === "credentials" ? (
            <Loader2 aria-hidden="true" className="crm-spin" />
          ) : (
            <ShieldCheck aria-hidden="true" />
          )}
          {busy === "credentials" ? "Validando" : "Validar e continuar"}
        </button>
      </div>
    </section>
  );
}

function readUazapiInstanceStatusLabel(status: string) {
  switch (status) {
    case "connected":
      return "conectada";
    case "disconnected":
      return "desconectada";
    default:
      return status;
  }
}

export function readUazapiInstanceOptionLabel(
  instance: CrmUazapiInstanceSummary,
) {
  const status = readUazapiInstanceStatusLabel(instance.status);
  return instance.connectedPhone
    ? `${instance.name} · ${status} · ${instance.connectedPhone}`
    : `${instance.name} · ${status}`;
}

export function UazapiInstanceStage({
  busy,
  canSubmit,
  draft,
  error,
  instances,
  mode,
  onBack,
  onChange,
  onModeChange,
  onSelectInstance,
  onSubmit,
  selectedInstanceId,
}: {
  busy: BusyState | null;
  canSubmit: boolean;
  draft: UazapiProvisionDraft;
  error: string | null;
  instances: readonly CrmUazapiInstanceSummary[];
  mode: UazapiProvisionMode;
  onBack: () => void;
  onChange: (draft: UazapiProvisionDraft) => void;
  onModeChange: (mode: UazapiProvisionMode) => void;
  onSelectInstance: (instanceId: string) => void;
  onSubmit: () => void;
  selectedInstanceId: string | undefined;
}) {
  const hasInstances = instances.length > 0;
  return (
    <section
      aria-labelledby="uazapi-instance-title"
      className="crm-zapi-credentials"
    >
      <div className="crm-zapi-stage-heading">
        <span>
          <Smartphone aria-hidden="true" />
        </span>
        <div>
          <small>Instância</small>
          <h4 id="uazapi-instance-title">Crie ou reutilize uma instância</h4>
          <p>
            O WhatsApp da loja roda em uma instância da conta uazapi validada.
            Crie uma instância nova ou conecte uma instância existente a este
            canal.
          </p>
        </div>
      </div>
      <div className="crm-zapi-credential-fields">
        <div className="crm-connection-field">
          <label htmlFor="uazapi-display-name">Nome da conexão</label>
          <input
            autoComplete="off"
            disabled={!canSubmit}
            id="uazapi-display-name"
            onChange={(event) =>
              onChange({ ...draft, displayName: event.target.value })
            }
            placeholder="WhatsApp principal da loja"
            value={draft.displayName}
          />
          <small>Exibido para a equipe na lista de canais do CRM.</small>
        </div>
        <div className="crm-connection-field">
          <label htmlFor="uazapi-phone">
            Telefone para pareamento (opcional)
          </label>
          <input
            autoComplete="tel"
            disabled={!canSubmit}
            id="uazapi-phone"
            inputMode="tel"
            onChange={(event) =>
              onChange({
                ...draft,
                phone: formatBrazilianWhatsappPhone(event.target.value),
              })
            }
            placeholder="+55 (11) 99999-9999"
            value={draft.phone}
          />
          <small>
            Usado apenas se você preferir parear por código do telefone.
          </small>
        </div>
        {hasInstances ? (
          <fieldset className="crm-connection-field">
            <legend>Origem da instância</legend>
            <label>
              <input
                checked={mode === "create"}
                disabled={!canSubmit}
                name="uazapi-instance-mode"
                onChange={() => onModeChange("create")}
                type="radio"
                value="create"
              />{" "}
              Criar nova instância
            </label>
            <label>
              <input
                checked={mode === "attach"}
                disabled={!canSubmit}
                name="uazapi-instance-mode"
                onChange={() => onModeChange("attach")}
                type="radio"
                value="attach"
              />{" "}
              Usar instância existente
            </label>
          </fieldset>
        ) : (
          <p className="crm-zapi-permission-note">
            Nenhuma instância foi encontrada nesta conta uazapi. Uma nova
            instância será criada automaticamente.
          </p>
        )}
        {hasInstances && mode === "attach" ? (
          <div className="crm-connection-field">
            <CrmSelect
              ariaLabel="Instância uazapi existente"
              disabled={!canSubmit}
              onChange={onSelectInstance}
              options={instances.map((instance) => ({
                label: readUazapiInstanceOptionLabel(instance),
                value: instance.id,
              }))}
              placeholder="Selecione a instância"
              value={selectedInstanceId}
            />
            <small>
              Instâncias já conectadas a um aparelho seguem para a etapa de
              pronto assim que o servidor confirmar.
            </small>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="crm-connection-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="crm-zapi-inline-actions">
        <button
          className="crm-action crm-action-muted"
          disabled={busy !== null}
          onClick={onBack}
          type="button"
        >
          Voltar para a conta
        </button>
        <button
          className="crm-action crm-action-primary crm-connection-save"
          disabled={busy !== null || !canSubmit}
          onClick={onSubmit}
          type="button"
        >
          {busy === "credentials" ? (
            <Loader2 aria-hidden="true" className="crm-spin" />
          ) : (
            <ServerCog aria-hidden="true" />
          )}
          {busy === "credentials"
            ? "Provisionando"
            : mode === "attach"
              ? "Conectar instância selecionada"
              : "Criar e provisionar conexão"}
        </button>
      </div>
    </section>
  );
}

export function UazapiWebhookSetupStatus(
  props: WhatsappWebhookSetupStatusProps,
) {
  return (
    <WhatsappWebhookSetupStatus
      {...props}
      failureDetail="O provedor não confirmou todos os webhooks. Nenhuma ativação completa foi informada."
      titleId="uazapi-webhook-title"
      webhookListAriaLabel="Estado dos webhooks UAZAPI"
    />
  );
}

export type UazapiPairingMethod = WhatsappPairingMethod;

const uazapiPairingCopy: WhatsappPairingCopy = {
  disconnectLabel: "Desconectar o aparelho",
  providerConfirmSentence:
    "Escolha QR Code ou código do telefone. O estado avança quando o provedor confirmar.",
  waitingDisconnectTitle: "Aguardando o provedor confirmar a desconexão",
};

export function UazapiPairingStage({
  pairingBlock,
  ...rest
}: Omit<
  ComponentProps<typeof CrmWhatsappPairingStage>,
  "copy" | "idPrefix" | "pairingBlock"
> & {
  pairingBlock: PairingBlock;
}) {
  return (
    <CrmWhatsappPairingStage
      {...rest}
      copy={uazapiPairingCopy}
      idPrefix="uazapi"
      pairingBlock={pairingBlock}
    />
  );
}

export function UazapiReadyState({
  canDisconnect = false,
  connection,
  isDisconnecting = false,
  onDisconnect,
  onPairAgain,
}: {
  canDisconnect?: boolean;
  connection: CrmProviderConnection;
  isDisconnecting?: boolean;
  onDisconnect?: () => void;
  onPairAgain?: () => void;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const phone =
    connection.live?.connectedPhone ??
    connection.metadata?.connectedPhone ??
    connection.phoneNumber ??
    connection.phone;
  return (
    <div className="crm-zapi-ready" role="status">
      <span aria-hidden="true">
        <CheckCircle2 />
      </span>
      <div>
        <small>Configuração concluída</small>
        <h4>WhatsApp conectado e pronto para uso</h4>
        <p>
          {phone
            ? `O número ${phone} já pode receber e enviar mensagens pelo CRM.`
            : "O provedor confirmou a conexão. O canal já pode receber e enviar mensagens pelo CRM."}
        </p>
        {connection.setup?.requiredTypes.length ? (
          <WebhookStatusList
            ariaLabel="Estado dos webhooks UAZAPI"
            requiredTypes={connection.setup.requiredTypes}
            succeededTypes={connection.setup.succeededTypes}
          />
        ) : null}
        {onPairAgain ? (
          <button
            className="crm-action crm-action-secondary"
            onClick={onPairAgain}
            type="button"
          >
            Reconectar ou trocar aparelho
          </button>
        ) : null}
        {onDisconnect ? (
          confirmDisconnect ? (
            <div className="crm-zapi-disconnect-confirm" role="alert">
              <p>
                Isso desconecta o aparelho da instância. Os webhooks e o
                histórico do CRM serão mantidos para a reconexão.
              </p>
              <div className="crm-zapi-inline-actions">
                <button
                  className="crm-action crm-action-danger"
                  disabled={!canDisconnect || isDisconnecting}
                  onClick={onDisconnect}
                  type="button"
                >
                  {isDisconnecting ? (
                    <Loader2 aria-hidden="true" className="crm-spin" />
                  ) : null}
                  {isDisconnecting ? "Desconectando" : "Confirmar desconexão"}
                </button>
                <button
                  className="crm-action crm-action-muted"
                  disabled={isDisconnecting}
                  onClick={() => setConfirmDisconnect(false)}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="crm-action crm-action-muted"
              disabled={!canDisconnect || isDisconnecting}
              onClick={() => setConfirmDisconnect(true)}
              type="button"
            >
              Desconectar o aparelho
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
