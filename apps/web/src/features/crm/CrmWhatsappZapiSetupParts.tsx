import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { crmSupportUrl } from "./crmSupport";

export type ZapiSetupStep = 1 | 2 | 3 | 4;

const stepLabels: ReadonlyArray<{ label: string; step: ZapiSetupStep }> = [
  { label: "Credenciais", step: 1 },
  { label: "Configuração", step: 2 },
  { label: "Pareamento", step: 3 },
  { label: "Pronto", step: 4 },
];

const webhookLabels: Readonly<Record<string, string>> = {
  "chat-presence": "Presença no chat",
  connected: "Aparelho conectado",
  delivery: "Entrega de mensagens",
  disconnected: "Aparelho desconectado",
  received: "Mensagens recebidas",
  status: "Status das mensagens",
};

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
    <nav
      aria-label="Progresso da configuração Z-API"
      className="crm-zapi-progress"
    >
      <p aria-live="polite" className="crm-zapi-progress-summary">
        Etapa {step} de 4 · {stepLabels[step - 1]?.label}
      </p>
      <ol>
        {stepLabels.map((item) => {
          const state =
            item.step < step
              ? "complete"
              : item.step === step
                ? "current"
                : "pending";
          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              data-state={state}
              key={item.step}
            >
              <span aria-hidden="true">
                {state === "complete" ? (
                  <Check />
                ) : state === "current" ? (
                  <Loader2 className="crm-spin" />
                ) : (
                  <Circle />
                )}
              </span>
              <small>Etapa {item.step}</small>
              <strong>{item.label}</strong>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ZapiWebhookSetupStatus({
  canConfigure,
  connection,
  isRefreshing,
  onRefresh,
}: {
  canConfigure: boolean;
  connection: CrmProviderConnection;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const setup = connection.setup;
  const status = setup?.status ?? "configuring";
  const failed = status === "failed" || status === "partial";
  const completedCount = setup?.succeededTypes.length ?? 0;
  const requiredCount = setup?.requiredTypes.length ?? 0;

  return (
    <section
      aria-labelledby="zapi-webhook-title"
      className="crm-zapi-automatic-setup"
      data-state={failed ? "failed" : "working"}
    >
      <span aria-hidden="true">
        {failed ? <AlertTriangle /> : <Loader2 className="crm-spin" />}
      </span>
      <div>
        <h4 id="zapi-webhook-title">
          {failed
            ? "A configuração automática precisa de atenção"
            : "Configurando os webhooks automaticamente"}
        </h4>
        <p>
          {failed
            ? "A Z-API não confirmou todos os webhooks. Nenhuma ativação completa foi informada."
            : "O sistema está substituindo e conferindo cada endpoint necessário. Esta tela atualiza o estado automaticamente."}
        </p>
        {requiredCount > 0 ? (
          <>
            <p className="crm-zapi-setup-count">
              {completedCount} de {requiredCount} webhooks confirmados
            </p>
            <WebhookStatusList
              requiredTypes={setup?.requiredTypes ?? []}
              succeededTypes={setup?.succeededTypes ?? []}
            />
          </>
        ) : null}
        <div className="crm-zapi-inline-actions">
          <button
            className="crm-action crm-action-secondary"
            disabled={isRefreshing || !canConfigure}
            onClick={onRefresh}
            type="button"
          >
            {isRefreshing ? (
              <Loader2 aria-hidden="true" className="crm-spin" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {isRefreshing ? "Verificando configuração" : "Verificar agora"}
          </button>
          {!canConfigure ? (
            <small className="crm-zapi-permission-note">
              Peça a um administrador da loja para verificar esta configuração.
            </small>
          ) : null}
          {failed ? (
            <a
              className="crm-zapi-support-link"
              href={crmSupportUrl(setup?.supportCode ?? null)}
              rel="noreferrer"
              target="_blank"
            >
              Falar com o suporte
            </a>
          ) : null}
        </div>
      </div>
    </section>
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

function WebhookStatusList({
  requiredTypes,
  succeededTypes,
}: {
  requiredTypes: readonly string[];
  succeededTypes: readonly string[];
}) {
  const succeeded = new Set(succeededTypes);
  return (
    <ul
      aria-label="Estado dos webhooks Z-API"
      className="crm-zapi-webhook-status-list"
    >
      {requiredTypes.map((type) => {
        const configured = succeeded.has(type);
        return (
          <li data-state={configured ? "configured" : "pending"} key={type}>
            {configured ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <Circle aria-hidden="true" />
            )}
            <span>{webhookLabels[type] ?? type}</span>
            <strong>{configured ? "Confirmado" : "Pendente"}</strong>
          </li>
        );
      })}
    </ul>
  );
}
