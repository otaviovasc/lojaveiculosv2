import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { formatBrazilianWhatsappPhone } from "../../lib/masks";
import { ConnectionSectionCard } from "./CrmWhatsappConnectionAdminParts";
import type {
  CrmWhatsappConnectionAllowance,
  CrmWhatsappCreateConnectionInput,
  CrmWhatsappProviderConnection,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";

type ZapiCredentialsDraft = {
  clientToken: string;
  instanceId: string;
  instanceToken: string;
};

const emptyCredentials: ZapiCredentialsDraft = {
  clientToken: "",
  instanceId: "",
  instanceToken: "",
};

type PairingBusyState = "qr" | "code";

async function runZapiPairingRequest<T>({
  busy,
  onFailure,
  onSuccess,
  request,
  resetOtherPairingState,
  setBusy,
  setError,
  fallbackError,
}: {
  busy: PairingBusyState;
  fallbackError: string;
  onFailure: () => void;
  onSuccess: (result: T) => void;
  request: () => Promise<T>;
  resetOtherPairingState: () => void;
  setBusy: (busy: PairingBusyState | null) => void;
  setError: (error: string | null) => void;
}) {
  setBusy(busy);
  setError(null);
  resetOtherPairingState();
  try {
    onSuccess(await request());
  } catch (caught) {
    onFailure();
    setError(formatApiErrorDisplay(caught, fallbackError));
  } finally {
    setBusy(null);
  }
}

export function CrmWhatsappZapiSetup({
  allowance,
  canPair,
  canSetup,
  connection,
  handlers,
  onBack,
  onConnection,
  zapiAddonContract,
}: {
  allowance: CrmWhatsappConnectionAllowance;
  canPair: boolean;
  canSetup: boolean;
  connection: CrmWhatsappProviderConnection | null;
  handlers: CrmWhatsappSelfServiceHandlers;
  onBack: () => void;
  onConnection: (connection: CrmWhatsappProviderConnection) => void;
  zapiAddonContract: CrmWhatsappZapiAddonContract | null;
}) {
  const [qr, setQr] = useState<{ expiresAt: string; qrCode: string } | null>(
    null,
  );
  const [pairingCode, setPairingCode] = useState<{
    code?: string;
    expiresAt?: string;
  } | null>(null);
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "addon" | "credentials" | "qr" | "code" | "refresh" | null
  >(null);
  const [now, setNow] = useState(() => Date.now());
  const qrExpired = Boolean(qr && new Date(qr.expiresAt).getTime() <= now);
  const codeExpired = Boolean(
    pairingCode?.expiresAt && new Date(pairingCode.expiresAt).getTime() <= now,
  );
  const isConnected =
    connection?.ready === true &&
    connection.live.providerStatus === "connected";
  const isEntitled =
    allowance.limit > 0 ||
    ["active", "paid_awaiting_setup"].includes(zapiAddonContract?.status ?? "");

  useEffect(() => {
    if (!qr?.expiresAt && !pairingCode?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [pairingCode?.expiresAt, qr?.expiresAt]);

  const connectionId = connection?.id;

  const requestAddon = async () => {
    if (!canSetup) return;
    if (!handlers.onRequestZapiAddon) {
      setError("A solicitação da Z-API não está disponível neste momento.");
      return;
    }
    setBusy("addon");
    setError(null);
    try {
      await handlers.onRequestZapiAddon();
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível registrar a solicitação da Z-API.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const saveCredentials = async () => {
    if (!canSetup) return;
    if (
      !credentials.clientToken.trim() ||
      !credentials.instanceId.trim() ||
      !credentials.instanceToken.trim()
    ) {
      setError("Informe o ID da instância e os dois tokens da Z-API.");
      return;
    }
    setBusy("credentials");
    setError(null);
    try {
      const input: CrmWhatsappCreateConnectionInput = {
        clientToken: credentials.clientToken.trim(),
        instanceId: credentials.instanceId.trim(),
        instanceToken: credentials.instanceToken.trim(),
        provider: "zapi",
      };
      const created = await handlers.onCreate(input);
      if (!created) {
        throw new Error(
          "A conexão não foi criada. Nenhuma credencial foi confirmada.",
        );
      }
      // Clear the write-only draft immediately after the API accepts it. The
      // returned connection is safe presentation data and never renders these
      // values back to the browser.
      setCredentials(emptyCredentials);
      onConnection(created);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível salvar a conexão Z-API.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const refresh = async () => {
    if (!canPair) return;
    setBusy("refresh");
    setError(null);
    try {
      await handlers.onRefreshConnections();
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Não foi possível atualizar o canal."),
      );
    } finally {
      setBusy(null);
    }
  };

  const requestQr = async () => {
    if (connectionId === undefined || !canPair) return;
    await runZapiPairingRequest({
      busy: "qr",
      fallbackError: "Não foi possível gerar o QR Code.",
      onFailure: () => setQr(null),
      onSuccess: setQr,
      request: async () => {
        if (!handlers.onRequestZapiPairingQr) {
          throw new Error("O pareamento Z-API ainda não está disponível.");
        }
        return handlers.onRequestZapiPairingQr(connectionId);
      },
      resetOtherPairingState: () => setPairingCode(null),
      setBusy,
      setError,
    });
  };

  const requestCode = async () => {
    if (connectionId === undefined || !canPair) return;
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
      setError("Informe um telefone válido com DDI, DDD e número.");
      return;
    }
    await runZapiPairingRequest({
      busy: "code",
      fallbackError: "Não foi possível solicitar o código de pareamento.",
      onFailure: () => setPairingCode(null),
      onSuccess: setPairingCode,
      request: async () => {
        if (!handlers.onRequestZapiPairingCode) {
          throw new Error("O pareamento Z-API ainda não está disponível.");
        }
        return handlers.onRequestZapiPairingCode(connectionId, normalizedPhone);
      },
      resetOtherPairingState: () => setQr(null),
      setBusy,
      setError,
    });
  };

  if (!connection) {
    return (
      <ConnectionSectionCard
        description="A Z-API é opcional e só fica disponível depois da confirmação do add-on."
        icon={<QrCode aria-hidden="true" />}
        title="Adicionar Z-API ao CRM"
      >
        <ZapiContractState
          contract={zapiAddonContract}
          canSetup={canSetup}
          isEntitled={isEntitled}
          isBusy={busy === "addon"}
          onRequest={() => void requestAddon()}
        />
        {canSetup &&
        isEntitled &&
        zapiAddonContract?.status !== "paid_awaiting_setup" ? (
          <div className="crm-whatsapp-connection-instance-grid">
            <p className="crm-whatsapp-connection-webhook-note">
              Informe os três valores uma única vez. Eles são enviados por
              conexão segura, não ficam salvos no navegador e nunca voltam na
              resposta da API.
            </p>
            <label className="crm-whatsapp-connection-field">
              ID da instância
              <input
                autoComplete="new-password"
                disabled={busy !== null || !canSetup}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    instanceId: event.target.value,
                  }))
                }
                spellCheck={false}
                type="password"
                value={credentials.instanceId}
              />
            </label>
            <label className="crm-whatsapp-connection-field">
              Token da instância
              <input
                autoComplete="new-password"
                disabled={busy !== null || !canSetup}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    instanceToken: event.target.value,
                  }))
                }
                spellCheck={false}
                type="password"
                value={credentials.instanceToken}
              />
            </label>
            <label className="crm-whatsapp-connection-field">
              Token do cliente
              <input
                autoComplete="new-password"
                disabled={busy !== null || !canSetup}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    clientToken: event.target.value,
                  }))
                }
                spellCheck={false}
                type="password"
                value={credentials.clientToken}
              />
            </label>
            <button
              className="crm-whatsapp-connection-save"
              disabled={busy !== null || !canSetup}
              onClick={() => void saveCredentials()}
              type="button"
            >
              {busy === "credentials" ? (
                <Loader2 aria-hidden="true" className="crm-spin" />
              ) : (
                <KeyRound aria-hidden="true" />
              )}
              {busy === "credentials" ? "Salvando" : "Salvar e conectar"}
            </button>
          </div>
        ) : null}
        {error ? (
          <p className="crm-whatsapp-connection-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="crm-action crm-action-secondary"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </button>
      </ConnectionSectionCard>
    );
  }

  return (
    <ConnectionSectionCard
      description="Pareie o telefone da loja com o canal preparado pela equipe."
      icon={
        isConnected ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <QrCode aria-hidden="true" />
        )
      }
      title="Conectar WhatsApp · Z-API"
    >
      {isConnected ? (
        <div className="crm-whatsapp-pairing-success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>
            <strong>WhatsApp conectado</strong>
            <small>O canal está pronto para receber e enviar mensagens.</small>
          </span>
        </div>
      ) : (
        <div className="crm-whatsapp-zapi-pairing-grid">
          <div className="crm-whatsapp-pairing-method">
            <h3>QR Code</h3>
            <p>Abra o WhatsApp no telefone e leia o código exibido.</p>
            {qr && !qrExpired ? (
              <img alt="QR Code para conectar o WhatsApp" src={qr.qrCode} />
            ) : (
              <button
                className="crm-action crm-action-secondary"
                disabled={busy !== null || !canPair}
                onClick={() => void requestQr()}
                type="button"
              >
                {busy === "qr" ? <Loader2 className="crm-spin" /> : <QrCode />}
                {qrExpired ? "Gerar novo QR Code" : "Gerar QR Code"}
              </button>
            )}
            {qrExpired ? (
              <small>
                Este QR Code expirou. Gere outro para tentar novamente.
              </small>
            ) : null}
          </div>
          <div className="crm-whatsapp-pairing-method">
            <h3>Código do telefone</h3>
            <p>
              Informe o telefone da loja com DDI. O número não é pré-preenchido.
            </p>
            <label className="crm-whatsapp-pairing-phone">
              Telefone para pareamento
              <input
                autoComplete="tel"
                inputMode="tel"
                onChange={(event) =>
                  setPhone(formatBrazilianWhatsappPhone(event.target.value))
                }
                placeholder="+55 (11) 99999-9999"
                value={phone}
              />
            </label>
            <button
              className="crm-action crm-action-secondary"
              disabled={busy !== null || !canPair || !phone.trim()}
              onClick={() => void requestCode()}
              type="button"
            >
              {busy === "code" ? (
                <Loader2 className="crm-spin" />
              ) : (
                <RefreshCw />
              )}
              Solicitar código
            </button>
            {pairingCode && !codeExpired ? (
              <output className="crm-whatsapp-pairing-code" aria-live="polite">
                {pairingCode.code ?? "Código solicitado. Confira o telefone."}
              </output>
            ) : null}
            {codeExpired ? (
              <small>
                O código expirou. Solicite outro para tentar novamente.
              </small>
            ) : null}
          </div>
        </div>
      )}
      {error ? (
        <p className="crm-whatsapp-connection-error" role="alert">
          {error}
        </p>
      ) : null}
      {!isConnected ? (
        <p className="crm-whatsapp-pairing-note">
          O status só muda depois que o provedor confirmar o pareamento.
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {!isConnected ? (
          <button
            className="crm-action crm-action-secondary"
            disabled={busy !== null || !canPair}
            onClick={() => void refresh()}
            type="button"
          >
            {busy === "refresh" ? (
              <Loader2 className="crm-spin" />
            ) : (
              <RefreshCw />
            )}
            Atualizar status
          </button>
        ) : null}
        <button
          className="crm-action crm-action-secondary"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </button>
      </div>
    </ConnectionSectionCard>
  );
}

function ZapiContractState({
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
              ? "A solicitação foi registrada. Nenhuma conexão oficial foi ativada ainda."
              : "A Z-API será ativada no próximo vencimento da assinatura, sem cobrança imediata."}
          </p>
        </div>
      </div>
    );
  }
  if (contract?.status === "paid_awaiting_setup") {
    return (
      <div className="crm-whatsapp-connection-protected-note" role="status">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Pagamento confirmado · configuração pendente</strong>
          <p>
            A equipe está preparando a instância. O pareamento será liberado
            quando o canal estiver pronto.
          </p>
        </div>
      </div>
    );
  }
  if (contract?.status === "active" || isEntitled) {
    return (
      <p className="crm-whatsapp-connection-webhook-note">
        Add-on Z-API disponível para esta loja. As credenciais serão usadas
        somente nesta configuração inicial.
      </p>
    );
  }
  return (
    <div className="crm-whatsapp-connection-protected-note">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>Integração opcional paga</strong>
        <p>
          O valor é definido pelo catálogo da assinatura. Solicite o add-on para
          o próximo ciclo; a API retornará o estado real da cobrança.
        </p>
        <button
          className="crm-action crm-action-primary"
          disabled={isBusy || !canSetup}
          onClick={onRequest}
          type="button"
        >
          {isBusy ? <Loader2 className="crm-spin" /> : null}
          {isBusy ? "Solicitando" : "Solicitar Z-API"}
        </button>
      </div>
    </div>
  );
}
