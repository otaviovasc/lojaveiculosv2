import { useEffect, useId, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  QrCode,
} from "lucide-react";
import { AppApiError, formatApiErrorDisplay } from "../../lib/apiErrors";
import { ConnectionSectionCard } from "./CrmWhatsappConnectionAdminParts";
import {
  CrmWhatsappZapiPairingStage,
  type ZapiPairingMethod,
} from "./CrmWhatsappZapiPairingStage";
import {
  readZapiSetupStep,
  ZapiContractState,
  ZapiReadyState,
  ZapiSetupProgress,
  ZapiWebhookSetupStatus,
} from "./CrmWhatsappZapiSetupParts";
import type {
  CrmWhatsappConnectionAllowance,
  CrmWhatsappCreateConnectionInput,
  CrmWhatsappProviderConnection,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";

type ZapiCredentialsDraft = {
  instanceId: string;
  instanceToken: string;
};

const emptyCredentials: ZapiCredentialsDraft = {
  instanceId: "",
  instanceToken: "",
};

type BusyState =
  "addon" | "code" | "credentials" | "disconnect" | "qr" | "refresh";

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
  const [busy, setBusy] = useState<BusyState | null>(null);
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pairingCode, setPairingCode] = useState<{
    code?: string;
    expiresAt?: string;
  } | null>(null);
  const [pairingMethod, setPairingMethod] = useState<ZapiPairingMethod>("qr");
  const [phone, setPhone] = useState("");
  const [pairAgain, setPairAgain] = useState(false);
  const [qr, setQr] = useState<{ expiresAt: string; qrCode: string } | null>(
    null,
  );
  const [showCredentials, setShowCredentials] = useState(false);
  const isEntitled =
    allowance.limit > 0 ||
    ["active", "paid_awaiting_setup"].includes(zapiAddonContract?.status ?? "");
  const resolvedStep = readZapiSetupStep({ connection, isEntitled });
  const step = pairAgain && resolvedStep === 5 ? 4 : resolvedStep;
  const qrExpired = Boolean(qr && new Date(qr.expiresAt).getTime() <= now);
  const codeExpired = Boolean(
    pairingCode?.expiresAt && new Date(pairingCode.expiresAt).getTime() <= now,
  );

  useEffect(() => {
    if (!qr?.expiresAt && !pairingCode?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [pairingCode?.expiresAt, qr?.expiresAt]);

  useEffect(() => {
    if (step !== 3 && step !== 4) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        if (step === 4 && connection && handlers.onRefreshZapiStatus) {
          void handlers
            .onRefreshZapiStatus(connection.id)
            .then(onConnection)
            .catch(() => undefined);
        } else {
          void handlers.onRefreshConnections();
        }
      }
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [connection, handlers, onConnection, step]);

  const requestAddon = async () => {
    if (!canSetup) return;
    if (!handlers.onRequestZapiAddon) {
      setError("A solicitação da Z-API não está disponível neste momento.");
      return;
    }
    await runAction({
      action: handlers.onRequestZapiAddon,
      busy: "addon",
      fallbackError: "Não foi possível registrar a solicitação da Z-API.",
      setBusy,
      setError,
    });
  };

  const saveCredentials = async () => {
    if (!canSetup) return;
    if (!credentials.instanceId.trim() || !credentials.instanceToken.trim()) {
      setError("Informe o ID e o token da instância Z-API.");
      return;
    }
    setBusy("credentials");
    setError(null);
    try {
      const created = await handlers.onCreate(
        buildZapiConnectionInput(credentials),
      );
      if (!created) {
        throw new Error(
          "A conexão não foi criada. Nenhuma credencial foi confirmada.",
        );
      }
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
    if (busy) return;
    const currentConnection = connection;
    const refreshStatus = currentConnection
      ? handlers.onRefreshZapiStatus
      : undefined;
    if (refreshStatus && currentConnection) {
      const result = await runAction({
        action: () => refreshStatus(currentConnection.id),
        busy: "refresh",
        fallbackError: "Não foi possível atualizar o canal.",
        setBusy,
        setError,
      });
      if (result) onConnection(result);
    } else {
      await runAction({
        action: handlers.onRefreshConnections,
        busy: "refresh",
        fallbackError: "Não foi possível atualizar o canal.",
        setBusy,
        setError,
      });
    }
  };

  const disconnect = async () => {
    const disconnectZapi = handlers.onDisconnectZapi;
    if (!connection || !canSetup || !disconnectZapi || busy) return;
    const result = await runAction({
      action: () => disconnectZapi(connection.id),
      busy: "disconnect",
      fallbackError:
        "Não foi possível desconectar o WhatsApp da Z-API. A conexão não foi marcada como desligada.",
      setBusy,
      setError,
    });
    if (result) onConnection(result);
  };

  const configureWebhooks = async () => {
    if (!connection || !canSetup || busy) return;
    const result = await runAction({
      action: () => handlers.onConfigureZapiWebhooks(connection.id),
      busy: "refresh",
      fallbackError:
        "Não foi possível verificar a configuração automática da Z-API.",
      setBusy,
      setError,
    });
    if (!result) return;
    onConnection(result.connection ?? { ...connection, setup: result.setup });
  };

  const requestQr = async () => {
    const requestPairingQr = handlers.onRequestZapiPairingQr;
    if (!connection || !canPair || !requestPairingQr) return;
    setQr(null);
    setBusy("qr");
    setError(null);
    try {
      setQr(await requestPairingQr(connection.id));
    } catch (caught) {
      if (requiresPhonePairing(caught)) {
        setPairingMethod("code");
        setError(
          "Este aparelho exige uma verificação adicional. Continue pelo telefone para concluir o pareamento com segurança.",
        );
      } else {
        setError(
          formatApiErrorDisplay(caught, "Não foi possível gerar o QR Code."),
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const requestCode = async () => {
    const requestPairingCode = handlers.onRequestZapiPairingCode;
    if (!connection || !canPair || !requestPairingCode) return;
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
      setError("Informe um telefone válido com DDI, DDD e número.");
      return;
    }
    setPairingCode(null);
    const result = await runAction({
      action: () => requestPairingCode(connection.id, normalizedPhone),
      busy: "code",
      fallbackError: "Não foi possível solicitar o código de pareamento.",
      setBusy,
      setError,
    });
    if (result) setPairingCode(result);
  };

  return (
    <ConnectionSectionCard
      className="crm-whatsapp-zapi-guided-card"
      description="Uma jornada segura do cadastro das credenciais até o primeiro canal pronto."
      icon={<QrCode aria-hidden="true" />}
      title="Conectar WhatsApp · Z-API"
    >
      <ZapiSetupProgress step={step} />
      <div className="crm-whatsapp-zapi-stage">
        {step === 1 ? (
          <ZapiContractState
            canSetup={canSetup}
            contract={zapiAddonContract}
            isBusy={busy === "addon"}
            isEntitled={isEntitled}
            onRequest={() => void requestAddon()}
          />
        ) : null}
        {step === 2 ? (
          <CredentialsStage
            busy={busy}
            canSetup={canSetup}
            credentials={credentials}
            error={error}
            onChange={setCredentials}
            onSave={() => void saveCredentials()}
            onToggleVisibility={() => setShowCredentials((current) => !current)}
            showCredentials={showCredentials}
          />
        ) : null}
        {step === 3 && connection ? (
          <ZapiWebhookSetupStatus
            canConfigure={canSetup}
            connection={connection}
            isRefreshing={busy === "refresh"}
            onRefresh={() => void configureWebhooks()}
          />
        ) : null}
        {step === 4 && connection ? (
          <CrmWhatsappZapiPairingStage
            busy={busy}
            canPair={canPair}
            codeExpired={codeExpired}
            method={pairingMethod}
            now={now}
            onMethodChange={setPairingMethod}
            onPhoneChange={setPhone}
            onRefresh={() => void refresh()}
            onRequestCode={() => void requestCode()}
            onRequestQr={() => void requestQr()}
            pairingCode={pairingCode}
            phone={phone}
            qr={qr}
            qrExpired={qrExpired}
          />
        ) : null}
        {step === 5 && connection ? (
          <ZapiReadyState
            canDisconnect={canSetup && Boolean(handlers.onDisconnectZapi)}
            connection={connection}
            isDisconnecting={busy === "disconnect"}
            onDisconnect={() => void disconnect()}
            {...(canPair ? { onPairAgain: () => setPairAgain(true) } : {})}
          />
        ) : null}
        {step !== 2 && error ? (
          <p className="crm-whatsapp-connection-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button className="crm-whatsapp-zapi-back" onClick={onBack} type="button">
        <ArrowLeft aria-hidden="true" />
        Ver outros canais
      </button>
    </ConnectionSectionCard>
  );
}

function requiresPhonePairing(error: unknown) {
  if (
    !(error instanceof AppApiError) ||
    error.code !== "CRM_CONNECTION_SETUP_PAIRING_METHOD_REQUIRED" ||
    !error.details ||
    typeof error.details !== "object" ||
    Array.isArray(error.details)
  ) {
    return false;
  }
  return (
    (error.details as Record<string, unknown>).nextAction ===
    "request_phone_code"
  );
}

function buildZapiConnectionInput(
  credentials: ZapiCredentialsDraft,
): CrmWhatsappCreateConnectionInput {
  return {
    instanceId: credentials.instanceId.trim(),
    instanceToken: credentials.instanceToken.trim(),
    provider: "zapi",
  };
}

function CredentialsStage({
  busy,
  canSetup,
  credentials,
  error,
  onChange,
  onSave,
  onToggleVisibility,
  showCredentials,
}: {
  busy: BusyState | null;
  canSetup: boolean;
  credentials: ZapiCredentialsDraft;
  error: string | null;
  onChange: (draft: ZapiCredentialsDraft) => void;
  onSave: () => void;
  onToggleVisibility: () => void;
  showCredentials: boolean;
}) {
  const invalid = error?.startsWith("Informe o ID") ?? false;
  return (
    <section
      aria-labelledby="zapi-credentials-title"
      className="crm-whatsapp-zapi-credentials"
    >
      <div className="crm-whatsapp-zapi-stage-heading">
        <span>
          <KeyRound aria-hidden="true" />
        </span>
        <div>
          <small>Cadastro único e protegido</small>
          <h4 id="zapi-credentials-title">Credenciais da instância Z-API</h4>
          <p>
            O ID e o token da instância são enviados uma única vez, não ficam
            salvos no navegador e nunca retornam pela API. O Client-Token da
            plataforma é aplicado pelo servidor.
          </p>
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
      <div className="crm-whatsapp-zapi-credential-fields">
        <CredentialField
          invalid={invalid}
          label="ID da instância"
          onChange={(value) => onChange({ ...credentials, instanceId: value })}
          showValue={showCredentials}
          value={credentials.instanceId}
        />
        <CredentialField
          invalid={invalid}
          label="Token da instância"
          onChange={(value) =>
            onChange({ ...credentials, instanceToken: value })
          }
          showValue={showCredentials}
          value={credentials.instanceToken}
        />
      </div>
      {error ? (
        <p className="crm-whatsapp-connection-error" role="alert">
          {error}
        </p>
      ) : null}
      {!canSetup ? (
        <p className="crm-whatsapp-zapi-permission-note">
          Peça a um administrador da loja para cadastrar as credenciais.
        </p>
      ) : null}
      <button
        className="crm-whatsapp-connection-save"
        disabled={busy !== null || !canSetup}
        onClick={onSave}
        type="button"
      >
        {busy === "credentials" ? (
          <Loader2 aria-hidden="true" className="crm-spin" />
        ) : (
          <KeyRound aria-hidden="true" />
        )}
        {busy === "credentials" ? "Salvando" : "Salvar credenciais"}
      </button>
    </section>
  );
}

function CredentialField({
  invalid,
  label,
  onChange,
  showValue,
  value,
}: {
  invalid: boolean;
  label: string;
  onChange: (value: string) => void;
  showValue: boolean;
  value: string;
}) {
  const inputId = useId();
  return (
    <div className="crm-whatsapp-connection-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        aria-invalid={invalid}
        autoComplete="off"
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

async function runAction<T>({
  action,
  busy,
  fallbackError,
  setBusy,
  setError,
}: {
  action: () => Promise<T | undefined>;
  busy: BusyState;
  fallbackError: string;
  setBusy: (busy: BusyState | null) => void;
  setError: (error: string | null) => void;
}) {
  setBusy(busy);
  setError(null);
  try {
    return await action();
  } catch (caught) {
    setError(formatApiErrorDisplay(caught, fallbackError));
    return undefined;
  } finally {
    setBusy(null);
  }
}
