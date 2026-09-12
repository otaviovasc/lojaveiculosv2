import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { formatBrazilianWhatsappPhone } from "../../lib/masks";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { crmSupportUrl } from "./crmSupport";

export type WhatsappSetupStep = 1 | 2 | 3 | 4;

export type WhatsappSetupStepLabel = {
  label: string;
  step: WhatsappSetupStep;
};

export const whatsappWebhookLabels: Readonly<Record<string, string>> = {
  "chat-presence": "Presença no chat",
  connected: "Aparelho conectado",
  delivery: "Entrega de mensagens",
  disconnected: "Aparelho desconectado",
  received: "Mensagens recebidas",
  status: "Status das mensagens",
};

export function WhatsappSetupProgress({
  ariaLabel,
  step,
  stepLabels,
}: {
  ariaLabel: string;
  step: WhatsappSetupStep;
  stepLabels: ReadonlyArray<WhatsappSetupStepLabel>;
}) {
  return (
    <nav aria-label={ariaLabel} className="crm-zapi-progress">
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

export type WhatsappWebhookSetupStatusProps = {
  canConfigure: boolean;
  connection: CrmProviderConnection;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function WhatsappWebhookSetupStatus({
  failureDetail,
  titleId,
  webhookListAriaLabel,
  canConfigure,
  connection,
  isRefreshing,
  onRefresh,
}: WhatsappWebhookSetupStatusProps & {
  failureDetail: string;
  titleId: string;
  webhookListAriaLabel: string;
}) {
  const setup = connection.setup;
  const status = setup?.status ?? "configuring";
  const failed = status === "failed" || status === "partial";
  const completedCount = setup?.succeededTypes.length ?? 0;
  const requiredCount = setup?.requiredTypes.length ?? 0;

  return (
    <section
      aria-labelledby={titleId}
      className="crm-zapi-automatic-setup"
      data-state={failed ? "failed" : "working"}
    >
      <span aria-hidden="true">
        {failed ? <AlertTriangle /> : <Loader2 className="crm-spin" />}
      </span>
      <div>
        <h4 id={titleId}>
          {failed
            ? "A configuração automática precisa de atenção"
            : "Configurando os webhooks automaticamente"}
        </h4>
        <p>
          {failed
            ? failureDetail
            : "O sistema está substituindo e conferindo cada endpoint necessário. Esta tela atualiza o estado automaticamente."}
        </p>
        {requiredCount > 0 ? (
          <>
            <p className="crm-zapi-setup-count">
              {completedCount} de {requiredCount} webhooks confirmados
            </p>
            <WebhookStatusList
              ariaLabel={webhookListAriaLabel}
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

export function WebhookStatusList({
  ariaLabel,
  requiredTypes,
  succeededTypes,
}: {
  ariaLabel: string;
  requiredTypes: readonly string[];
  succeededTypes: readonly string[];
}) {
  const succeeded = new Set(succeededTypes);
  return (
    <ul aria-label={ariaLabel} className="crm-zapi-webhook-status-list">
      {requiredTypes.map((type) => {
        const configured = succeeded.has(type);
        return (
          <li data-state={configured ? "configured" : "pending"} key={type}>
            {configured ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <Circle aria-hidden="true" />
            )}
            <span>{whatsappWebhookLabels[type] ?? type}</span>
            <strong>{configured ? "Confirmado" : "Pendente"}</strong>
          </li>
        );
      })}
    </ul>
  );
}

export type WhatsappPairingMethod = "code" | "qr";
export type WhatsappPairingBlock =
  "disconnect_required" | "waiting_disconnect" | null;

export type WhatsappPairingStageBusy =
  "addon" | "code" | "credentials" | "disconnect" | "qr" | "refresh" | null;

export type WhatsappPairingCopy = {
  disconnectLabel: string;
  providerConfirmSentence: string;
  waitingDisconnectTitle: string;
};

export type WhatsappPairingStageProps = {
  busy: WhatsappPairingStageBusy;
  canDisconnect: boolean;
  canPair: boolean;
  codeExpired: boolean;
  method: WhatsappPairingMethod;
  now: number;
  onMethodChange: (method: WhatsappPairingMethod) => void;
  onDisconnect: () => void;
  onPhoneChange: (phone: string) => void;
  onRefresh: () => void;
  onRequestCode: () => void;
  onRequestQr: () => void;
  pairingCode: { code?: string; expiresAt?: string } | null;
  pairingBlock: WhatsappPairingBlock;
  phone: string;
  qr: { expiresAt: string; qrCode: string } | null;
  qrExpired: boolean;
};

export function CrmWhatsappPairingStage({
  copy,
  idPrefix,
  busy,
  canDisconnect,
  canPair,
  codeExpired,
  method,
  now,
  onMethodChange,
  onDisconnect,
  onPhoneChange,
  onRefresh,
  onRequestCode,
  onRequestQr,
  pairingCode,
  pairingBlock,
  phone,
  qr,
  qrExpired,
}: WhatsappPairingStageProps & {
  copy: WhatsappPairingCopy;
  idPrefix: string;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const pairingIdBase = idPrefix + "-pairing";
  return (
    <section
      aria-busy={busy !== null}
      aria-labelledby={`${pairingIdBase}-title`}
      className="crm-zapi-pairing"
    >
      <div className="crm-zapi-stage-heading">
        <span>
          <QrCode aria-hidden="true" />
        </span>
        <div>
          <small>Última etapa</small>
          <h4 id={`${pairingIdBase}-title`}>Pareie o telefone da loja</h4>
          <p>{copy.providerConfirmSentence}</p>
        </div>
      </div>
      {pairingBlock ? (
        <div className="crm-zapi-disconnect-confirm" role="alert">
          <strong>
            {pairingBlock === "waiting_disconnect"
              ? copy.waitingDisconnectTitle
              : "Esta instância ainda está conectada a um aparelho"}
          </strong>
          <p>
            {pairingBlock === "waiting_disconnect"
              ? "O pareamento será liberado somente quando a consulta ao provedor confirmar que o aparelho foi desconectado."
              : "Desconecte o aparelho atual antes de gerar um novo QR Code ou código de telefone. Os webhooks e o histórico do CRM serão mantidos."}
          </p>
          {pairingBlock === "disconnect_required" ? (
            confirmDisconnect ? (
              <div className="crm-zapi-inline-actions">
                <button
                  className="crm-action crm-action-danger"
                  disabled={!canDisconnect || busy !== null}
                  onClick={onDisconnect}
                  type="button"
                >
                  {busy === "disconnect" ? (
                    <Loader2 aria-hidden="true" className="crm-spin" />
                  ) : null}
                  {busy === "disconnect"
                    ? "Desconectando"
                    : "Confirmar desconexão"}
                </button>
                <button
                  className="crm-action crm-action-muted"
                  disabled={busy !== null}
                  onClick={() => setConfirmDisconnect(false)}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                className="crm-action crm-action-muted"
                disabled={!canDisconnect || busy !== null}
                onClick={() => setConfirmDisconnect(true)}
                type="button"
              >
                {copy.disconnectLabel}
              </button>
            )
          ) : null}
          {!canDisconnect ? (
            <small className="crm-zapi-permission-note">
              Peça a um administrador da loja para desconectar o aparelho.
            </small>
          ) : null}
        </div>
      ) : null}
      <div
        aria-label="Método de pareamento"
        className="crm-pairing-tabs"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = method === "qr" ? "code" : "qr";
          onMethodChange(next);
          document.getElementById(`${pairingIdBase}-tab-${next}`)?.focus();
        }}
        role="tablist"
      >
        <PairingTab
          active={method === "qr"}
          idPrefix={idPrefix}
          label="QR Code"
          method="qr"
          onSelect={onMethodChange}
        />
        <PairingTab
          active={method === "code"}
          idPrefix={idPrefix}
          label="Código do telefone"
          method="code"
          onSelect={onMethodChange}
        />
      </div>
      {method === "qr" ? (
        <div
          aria-labelledby={`${pairingIdBase}-tab-qr`}
          className="crm-pairing-panel"
          id={`${pairingIdBase}-qr`}
          role="tabpanel"
        >
          {qr && !qrExpired ? (
            <div className="crm-pairing-qr">
              <div className="crm-pairing-qr-frame">
                <img alt="QR Code para conectar o WhatsApp" src={qr.qrCode} />
              </div>
              <div className="crm-pairing-qr-details">
                <small>Leitura segura</small>
                <h4>Aponte a câmera do WhatsApp para o código</h4>
                <p>
                  No telefone, abra Dispositivos conectados, escolha Conectar
                  dispositivo e leia este código.
                </p>
                <p className="crm-pairing-countdown">
                  Expira em {formatRemainingTime(qr.expiresAt, now)}
                </p>
              </div>
            </div>
          ) : (
            <div className="crm-pairing-empty">
              <QrCode aria-hidden="true" />
              <p>
                Abra o WhatsApp no telefone e leia o código que será exibido
                aqui.
              </p>
              <button
                className="crm-action crm-action-primary"
                disabled={busy !== null || !canPair}
                onClick={onRequestQr}
                type="button"
              >
                {busy === "qr" ? (
                  <Loader2 aria-hidden="true" className="crm-spin" />
                ) : (
                  <QrCode aria-hidden="true" />
                )}
                {busy === "qr"
                  ? "Gerando QR Code"
                  : qrExpired
                    ? "Gerar novo QR Code"
                    : "Gerar QR Code"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          aria-labelledby={`${pairingIdBase}-tab-code`}
          className="crm-pairing-panel"
          id={`${pairingIdBase}-code`}
          role="tabpanel"
        >
          <label className="crm-pairing-phone">
            Telefone para pareamento
            <input
              autoComplete="tel"
              inputMode="tel"
              onChange={(event) =>
                onPhoneChange(formatBrazilianWhatsappPhone(event.target.value))
              }
              placeholder="+55 (11) 99999-9999"
              value={phone}
            />
          </label>
          <button
            className="crm-action crm-action-primary"
            disabled={busy !== null || !canPair || !phone.trim()}
            onClick={onRequestCode}
            type="button"
          >
            {busy === "code" ? (
              <Loader2 aria-hidden="true" className="crm-spin" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {busy === "code" ? "Solicitando código" : "Solicitar código"}
          </button>
          {pairingCode && !codeExpired ? (
            <output aria-live="polite" className="crm-pairing-code">
              {pairingCode.code ?? "Código solicitado. Confira o telefone."}
            </output>
          ) : null}
          {codeExpired ? (
            <small>
              O código expirou. Solicite outro para tentar novamente.
            </small>
          ) : null}
        </div>
      )}
      {!canPair ? (
        <p className="crm-zapi-permission-note">
          Peça a um administrador da loja para parear o telefone.
        </p>
      ) : null}
      <div className="crm-zapi-auto-refresh" role="status">
        <span>Atualização automática ativa</span>
        <button
          className="crm-action crm-action-secondary"
          disabled={busy !== null}
          onClick={onRefresh}
          type="button"
        >
          {busy === "refresh" ? (
            <Loader2 aria-hidden="true" className="crm-spin" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          {busy === "refresh" ? "Verificando status" : "Verificar agora"}
        </button>
      </div>
    </section>
  );
}

function PairingTab({
  active,
  idPrefix,
  label,
  method,
  onSelect,
}: {
  active: boolean;
  idPrefix: string;
  label: string;
  method: WhatsappPairingMethod;
  onSelect: (method: WhatsappPairingMethod) => void;
}) {
  const pairingIdBase = idPrefix + "-pairing";
  return (
    <button
      aria-controls={`${pairingIdBase}-${method}`}
      aria-selected={active}
      className="crm-pairing-tab"
      data-active={active}
      id={`${pairingIdBase}-tab-${method}`}
      onClick={() => onSelect(method)}
      role="tab"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      {label}
    </button>
  );
}

function formatRemainingTime(expiresAt: string, now: number) {
  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - now) / 1_000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
