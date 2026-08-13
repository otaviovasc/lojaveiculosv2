import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";
import type { CrmWhatsappZapiAddonContract } from "./crmWhatsappTypes";
import { crmWhatsappSupportUrl } from "./crmWhatsappSupport";

export type ZapiSetupStep = 1 | 2 | 3 | 4 | 5;

const stepLabels: ReadonlyArray<{ label: string; step: ZapiSetupStep }> = [
  { label: "Add-on", step: 1 },
  { label: "Credenciais", step: 2 },
  { label: "Configuração", step: 3 },
  { label: "Pareamento", step: 4 },
  { label: "Pronto", step: 5 },
];

export function readZapiSetupStep({
  connection,
  isEntitled,
}: {
  connection: CrmWhatsappProviderConnection | null;
  isEntitled: boolean;
}): ZapiSetupStep {
  if (!isEntitled) return 1;
  if (!connection) return 2;
  if (connection.setup?.status !== "configured") return 3;
  if (
    connection.ready !== true ||
    connection.live.providerStatus !== "connected"
  ) {
    return 4;
  }
  return 5;
}

export function ZapiSetupProgress({ step }: { step: ZapiSetupStep }) {
  return (
    <nav
      aria-label="Progresso da configuração Z-API"
      className="crm-whatsapp-zapi-progress"
    >
      <p aria-live="polite" className="crm-whatsapp-zapi-progress-summary">
        Etapa {step} de 5 · {stepLabels[step - 1]?.label}
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
                {state === "complete" ? <Check /> : <Circle />}
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

export function ZapiContractState({
  canSetup,
  contract,
  isBusy,
  isEntitled,
  onRequest,
}: {
  canSetup: boolean;
  contract: CrmWhatsappZapiAddonContract | null;
  isBusy: boolean;
  isEntitled: boolean;
  onRequest: () => void;
}) {
  if (contract?.status === "pending" || contract?.status === "scheduled") {
    return (
      <div className="crm-whatsapp-connection-protected-note" role="status">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>
            {contract.status === "pending"
              ? "Aguardando confirmação de pagamento"
              : "Ativação programada"}
          </strong>
          <p>
            {contract.status === "pending"
              ? "A solicitação foi registrada. Nenhuma conexão foi ativada ainda."
              : "A Z-API será ativada no próximo vencimento da assinatura, sem cobrança imediata."}
          </p>
        </div>
      </div>
    );
  }

  if (contract?.status === "paid_awaiting_setup") {
    return (
      <div className="crm-whatsapp-connection-protected-note" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <strong>Pagamento confirmado</strong>
          <p>
            O add-on está liberado. Cadastre as credenciais para iniciar a
            configuração automática dos webhooks.
          </p>
        </div>
      </div>
    );
  }

  if (contract?.status === "active" || isEntitled) {
    return (
      <div className="crm-whatsapp-connection-protected-note" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <strong>Add-on Z-API ativo</strong>
          <p>A loja pode seguir para o cadastro seguro das credenciais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-whatsapp-connection-protected-note">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>Integração opcional paga</strong>
        <p>
          O valor e as condições vêm do catálogo da assinatura da loja. A
          solicitação não ativa nem conecta o canal sem confirmação de
          pagamento.
        </p>
        <button
          className="crm-action crm-action-primary"
          disabled={isBusy || !canSetup}
          onClick={onRequest}
          type="button"
        >
          {isBusy ? <Loader2 aria-hidden="true" className="crm-spin" /> : null}
          {isBusy ? "Solicitando" : "Solicitar Z-API"}
        </button>
        {!canSetup ? (
          <small className="crm-whatsapp-zapi-permission-note">
            Peça a um administrador da loja para gerenciar este add-on.
          </small>
        ) : null}
      </div>
    </div>
  );
}

export function ZapiWebhookSetupStatus({
  canConfigure,
  connection,
  isRefreshing,
  onRefresh,
}: {
  canConfigure: boolean;
  connection: CrmWhatsappProviderConnection;
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
      className="crm-whatsapp-zapi-automatic-setup"
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
          <p className="crm-whatsapp-zapi-setup-count">
            {completedCount} de {requiredCount} webhooks confirmados
          </p>
        ) : null}
        <div className="crm-whatsapp-zapi-inline-actions">
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
            <small className="crm-whatsapp-zapi-permission-note">
              Peça a um administrador da loja para verificar esta configuração.
            </small>
          ) : null}
          {failed ? (
            <a
              className="crm-whatsapp-zapi-support-link"
              href={crmWhatsappSupportUrl(setup?.supportCode ?? null)}
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
  connection: CrmWhatsappProviderConnection;
  isDisconnecting?: boolean;
  onDisconnect?: () => void;
  onPairAgain?: () => void;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const phone =
    connection.live.connectedPhone ??
    connection.metadata?.connectedPhone ??
    connection.phone;
  return (
    <div className="crm-whatsapp-zapi-ready" role="status">
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
        {onPairAgain ? (
          <button
            className="crm-action crm-action-secondary"
            onClick={onPairAgain}
            type="button"
          >
            Parear outro aparelho
          </button>
        ) : null}
        {onDisconnect ? (
          confirmDisconnect ? (
            <div className="crm-whatsapp-zapi-disconnect-confirm" role="alert">
              <p>
                Isso desconecta o aparelho da instância Z-API. Os webhooks e o
                histórico do CRM serão mantidos para a reconexão.
              </p>
              <div className="crm-whatsapp-zapi-inline-actions">
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
