import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import type { CrmProviderConnection } from "./crmConversationTypes";
import {
  WebhookStatusList,
  WhatsappSetupProgress,
  WhatsappWebhookSetupStatus,
  type WhatsappSetupStep,
  type WhatsappSetupStepLabel,
  type WhatsappWebhookSetupStatusProps,
} from "./CrmWhatsappSetupParts.shared";

export type ZapiSetupStep = WhatsappSetupStep;

const zapiStepLabels: ReadonlyArray<WhatsappSetupStepLabel> = [
  { label: "Credenciais", step: 1 },
  { label: "Configuração", step: 2 },
  { label: "Pareamento", step: 3 },
  { label: "Pronto", step: 4 },
];

export function readZapiSetupStep({
  connection,
}: {
  connection: CrmProviderConnection | null;
}): ZapiSetupStep {
  if (!connection || connection.readiness?.reason === "credentials_incomplete")
    return 1;
  if (connection.setup?.status !== "configured") return 2;
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

export function ZapiSetupProgress({ step }: { step: ZapiSetupStep }) {
  return (
    <WhatsappSetupProgress
      ariaLabel="Progresso da configuração Z-API"
      step={step}
      stepLabels={zapiStepLabels}
    />
  );
}

export function ZapiWebhookSetupStatus(props: WhatsappWebhookSetupStatusProps) {
  return (
    <WhatsappWebhookSetupStatus
      {...props}
      failureDetail="A Z-API não confirmou todos os webhooks. Nenhuma ativação completa foi informada."
      titleId="zapi-webhook-title"
      webhookListAriaLabel="Estado dos webhooks Z-API"
    />
  );
}

export function ZapiReadyState({
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
            ariaLabel="Estado dos webhooks Z-API"
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
                Isso desconecta o aparelho da instância Z-API. Os webhooks e o
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
              Desconectar WhatsApp da Z-API
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
