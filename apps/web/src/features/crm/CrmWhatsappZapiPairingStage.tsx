import { Loader2, QrCode, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatBrazilianWhatsappPhone } from "../../lib/masks";

export type ZapiPairingMethod = "code" | "qr";
export type ZapiPairingBlock =
  "disconnect_required" | "waiting_disconnect" | null;

type PairingBusyState =
  "addon" | "code" | "credentials" | "disconnect" | "qr" | "refresh" | null;

export function CrmWhatsappZapiPairingStage({
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
}: {
  busy: PairingBusyState;
  canDisconnect: boolean;
  canPair: boolean;
  codeExpired: boolean;
  method: ZapiPairingMethod;
  now: number;
  onMethodChange: (method: ZapiPairingMethod) => void;
  onDisconnect: () => void;
  onPhoneChange: (phone: string) => void;
  onRefresh: () => void;
  onRequestCode: () => void;
  onRequestQr: () => void;
  pairingCode: { code?: string; expiresAt?: string } | null;
  pairingBlock: ZapiPairingBlock;
  phone: string;
  qr: { expiresAt: string; qrCode: string } | null;
  qrExpired: boolean;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  return (
    <section
      aria-labelledby="zapi-pairing-title"
      className="crm-whatsapp-zapi-pairing"
    >
      <div className="crm-whatsapp-zapi-stage-heading">
        <span>
          <QrCode aria-hidden="true" />
        </span>
        <div>
          <small>Última etapa</small>
          <h4 id="zapi-pairing-title">Pareie o telefone da loja</h4>
          <p>
            Escolha QR Code ou código do telefone. O estado avança quando a
            Z-API confirmar.
          </p>
        </div>
      </div>
      {pairingBlock ? (
        <div className="crm-whatsapp-zapi-disconnect-confirm" role="alert">
          <strong>
            {pairingBlock === "waiting_disconnect"
              ? "Aguardando a Z-API confirmar a desconexão"
              : "Esta instância ainda está conectada a um aparelho"}
          </strong>
          <p>
            {pairingBlock === "waiting_disconnect"
              ? "O pareamento será liberado somente quando a consulta ao provedor confirmar que o aparelho foi desconectado."
              : "Desconecte o aparelho atual antes de gerar um novo QR Code ou código de telefone. Os webhooks e o histórico do CRM serão mantidos."}
          </p>
          {pairingBlock === "disconnect_required" ? (
            confirmDisconnect ? (
              <div className="crm-whatsapp-zapi-inline-actions">
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
                Desconectar WhatsApp da Z-API
              </button>
            )
          ) : null}
          {!canDisconnect ? (
            <small className="crm-whatsapp-zapi-permission-note">
              Peça a um administrador da loja para desconectar o aparelho.
            </small>
          ) : null}
        </div>
      ) : null}
      <div
        aria-label="Método de pareamento"
        className="crm-whatsapp-pairing-tabs"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = method === "qr" ? "code" : "qr";
          onMethodChange(next);
          document.getElementById(`zapi-pairing-tab-${next}`)?.focus();
        }}
        role="tablist"
      >
        <PairingTab
          active={method === "qr"}
          label="QR Code"
          method="qr"
          onSelect={onMethodChange}
        />
        <PairingTab
          active={method === "code"}
          label="Código do telefone"
          method="code"
          onSelect={onMethodChange}
        />
      </div>
      {method === "qr" ? (
        <div
          aria-labelledby="zapi-pairing-tab-qr"
          className="crm-whatsapp-pairing-panel"
          id="zapi-pairing-qr"
          role="tabpanel"
        >
          {qr && !qrExpired ? (
            <>
              <img alt="QR Code para conectar o WhatsApp" src={qr.qrCode} />
              <p className="crm-whatsapp-pairing-countdown">
                Expira em {formatRemainingTime(qr.expiresAt, now)}
              </p>
            </>
          ) : (
            <div className="crm-whatsapp-pairing-empty">
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
                {qrExpired ? "Gerar novo QR Code" : "Gerar QR Code"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          aria-labelledby="zapi-pairing-tab-code"
          className="crm-whatsapp-pairing-panel"
          id="zapi-pairing-code"
          role="tabpanel"
        >
          <label className="crm-whatsapp-pairing-phone">
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
            Solicitar código
          </button>
          {pairingCode && !codeExpired ? (
            <output aria-live="polite" className="crm-whatsapp-pairing-code">
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
        <p className="crm-whatsapp-zapi-permission-note">
          Peça a um administrador da loja para parear o telefone.
        </p>
      ) : null}
      <div className="crm-whatsapp-zapi-auto-refresh" role="status">
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
          Verificar agora
        </button>
      </div>
    </section>
  );
}

function PairingTab({
  active,
  label,
  method,
  onSelect,
}: {
  active: boolean;
  label: string;
  method: ZapiPairingMethod;
  onSelect: (method: ZapiPairingMethod) => void;
}) {
  return (
    <button
      aria-controls={`zapi-pairing-${method}`}
      aria-selected={active}
      className="crm-whatsapp-pairing-tab"
      data-active={active}
      id={`zapi-pairing-tab-${method}`}
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
