import { CheckCircle2, Loader2, ServerCog } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { formatBrazilianWhatsappPhone } from "../../lib/masks";
import type { CrmProviderConnection } from "./crmConversationTypes";
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

export type UazapiProvisionDraft = {
  displayName: string;
  phone: string;
};

export const emptyUazapiProvisionDraft: UazapiProvisionDraft = {
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

export function UazapiProvisionStage({
  busy,
  canSubmit,
  draft,
  error,
  onChange,
  onSave,
}: {
  busy: BusyState | null;
  canSubmit: boolean;
  draft: UazapiProvisionDraft;
  error: string | null;
  onChange: (draft: UazapiProvisionDraft) => void;
  onSave: () => void;
}) {
  return (
    <section
      aria-labelledby="uazapi-provision-title"
      className="crm-zapi-credentials"
    >
      <div className="crm-zapi-stage-heading">
        <span>
          <ServerCog aria-hidden="true" />
        </span>
        <div>
          <small>Provisionamento automático</small>
          <h4 id="uazapi-provision-title">Nomeie a conexão da loja</h4>
          <p>
            O workspace provisiona a instância e o número automaticamente. Você
            não cadastra credenciais: elas são criadas e guardadas pelo
            servidor.
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
          className="crm-connection-save"
          disabled={busy !== null || !canSubmit}
          onClick={onSave}
          type="button"
        >
          {busy === "credentials" ? (
            <Loader2 aria-hidden="true" className="crm-spin" />
          ) : (
            <ServerCog aria-hidden="true" />
          )}
          {busy === "credentials" ? "Provisionando" : "Provisionar conexão"}
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
