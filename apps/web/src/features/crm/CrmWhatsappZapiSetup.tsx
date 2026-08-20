import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  QrCode,
} from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { ConnectionSectionCard } from "./CrmConnectionAdminParts";
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
  CrmConnectionAllowance,
  CrmCreateConnectionInput,
  CrmProviderConnection,
  CrmWhatsappZapiAddonContract,
} from "./crmConversationTypes";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";
import {
  isProviderDisconnected,
  requiresPhonePairing,
  requiresProviderDisconnect,
} from "./crmZapiPairingState";

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
type PairingBlock = "disconnect_required" | "waiting_disconnect" | null;

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
  allowance: CrmConnectionAllowance;
  canPair: boolean;
  canSetup: boolean;
  connection: CrmProviderConnection | null;
  handlers: CrmConnectionSelfServiceHandlers;
  onBack: () => void;
  onConnection: (connection: CrmProviderConnection) => void;
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
  const [pairingBlock, setPairingBlock] = useState<PairingBlock>(null);
  const [phone, setPhone] = useState("");
  const [pairAgain, setPairAgain] = useState(false);
  const [qr, setQr] = useState<{ expiresAt: string; qrCode: string } | null>(
    null,
  );
  const [showCredentials, setShowCredentials] = useState(false);
  const autoRefreshInFlightRef = useRef(false);
  const actionGenerationRef = useRef(0);
  const currentConnectionIdRef = useRef<string | null>(connection?.id ?? null);
  currentConnectionIdRef.current = connection?.id ?? null;
  const beginAction = useCallback(() => ++actionGenerationRef.current, []);
  const isCurrentAction = useCallback(
    (generation: number, connectionId?: string) =>
      generation === actionGenerationRef.current &&
      (connectionId === undefined ||
        currentConnectionIdRef.current === connectionId),
    [],
  );
  const isEntitled =
    allowance.limit > 0 ||
    ["active", "paid_awaiting_setup"].includes(zapiAddonContract?.status ?? "");
  const resolvedStep = readZapiSetupStep({ connection, isEntitled });
  const step = pairAgain && resolvedStep === 5 ? 4 : resolvedStep;
  const qrExpired = Boolean(qr && new Date(qr.expiresAt).getTime() <= now);
  const codeExpired = Boolean(
    pairingCode?.expiresAt && new Date(pairingCode.expiresAt).getTime() <= now,
  );

  const connectionStateKey = [
    connection?.id ?? "none",
    connection?.externalInstanceId ?? "none",
    connection?.setup?.status ?? "none",
    connection?.live?.providerStatus ?? "unknown",
    connection?.readiness?.ready ?? connection?.ready ?? "unknown",
    connection?.state ?? connection?.status ?? "unknown",
  ].join(":");
  const previousConnectionStateKeyRef = useRef(connectionStateKey);
  if (previousConnectionStateKeyRef.current !== connectionStateKey) {
    previousConnectionStateKeyRef.current = connectionStateKey;
    actionGenerationRef.current += 1;
  }

  useEffect(() => {
    autoRefreshInFlightRef.current = false;
    setBusy(null);
    setError(null);
    setPairingCode(null);
    setPairAgain(false);
    setQr(null);
    setNow(Date.now());
  }, [connectionStateKey]);

  useEffect(() => {
    setPairingBlock(null);
    setPairingMethod("qr");
    setPhone("");
  }, [connection?.id]);

  useEffect(() => {
    if (!qr?.expiresAt && !pairingCode?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [pairingCode?.expiresAt, qr?.expiresAt]);

  useEffect(() => {
    if (step !== 3 && step !== 4 && step !== 5) return undefined;

    const refreshConnections = handlers.onRefreshConnections;
    const refreshZapiStatus = handlers.onRefreshZapiStatus;
    const connectionId = connection?.id;

    const refreshAutomatically = async () => {
      if (
        document.visibilityState !== "visible" ||
        autoRefreshInFlightRef.current ||
        busy
      ) {
        return;
      }
      const actionGeneration = beginAction();
      autoRefreshInFlightRef.current = true;
      try {
        if ((step === 4 || step === 5) && connectionId && refreshZapiStatus) {
          const refreshed = await refreshZapiStatus(connectionId);
          if (!isCurrentAction(actionGeneration, connectionId)) return;
          onConnection(refreshed);
          if (isProviderDisconnected(refreshed)) setPairingBlock(null);
        } else {
          await refreshConnections();
        }
      } catch {
        // Automatic checks stay quiet; the explicit action exposes failures.
      } finally {
        autoRefreshInFlightRef.current = false;
      }
    };

    const timer = window.setInterval(() => void refreshAutomatically(), 5_000);
    return () => window.clearInterval(timer);
  }, [
    beginAction,
    busy,
    connection?.id,
    handlers.onRefreshConnections,
    handlers.onRefreshZapiStatus,
    isCurrentAction,
    onConnection,
    step,
  ]);

  const requestAddon = async () => {
    if (!canSetup) return;
    if (!handlers.onRequestZapiAddon) {
      setError("A solicitação da Z-API não está disponível neste momento.");
      return;
    }
    const actionGeneration = beginAction();
    await runAction({
      action: handlers.onRequestZapiAddon,
      busy: "addon",
      fallbackError: "Não foi possível registrar a solicitação da Z-API.",
      isCurrent: () => isCurrentAction(actionGeneration),
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
    const actionGeneration = beginAction();
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
      if (!isCurrentAction(actionGeneration)) return;
      setCredentials(emptyCredentials);
      onConnection(created);
    } catch (caught) {
      if (isCurrentAction(actionGeneration)) {
        setError(
          formatApiErrorDisplay(
            caught,
            "Não foi possível salvar a conexão Z-API.",
          ),
        );
      }
    } finally {
      if (isCurrentAction(actionGeneration)) setBusy(null);
    }
  };

  const refresh = async () => {
    if (busy) return;
    const currentConnection = connection;
    const actionGeneration = beginAction();
    const connectionId = currentConnection?.id;
    const refreshStatus = currentConnection
      ? handlers.onRefreshZapiStatus
      : undefined;
    if (refreshStatus && currentConnection) {
      const result = await runAction({
        action: () => refreshStatus(currentConnection.id),
        busy: "refresh",
        fallbackError: "Não foi possível atualizar o canal.",
        isCurrent: () => isCurrentAction(actionGeneration, connectionId),
        setBusy,
        setError,
      });
      if (result && isCurrentAction(actionGeneration, connectionId)) {
        if (isProviderDisconnected(result)) setPairingBlock(null);
        onConnection(result);
      }
    } else {
      await runAction({
        action: handlers.onRefreshConnections,
        busy: "refresh",
        fallbackError: "Não foi possível atualizar o canal.",
        isCurrent: () => isCurrentAction(actionGeneration),
        setBusy,
        setError,
      });
    }
  };

  const disconnect = async () => {
    const disconnectZapi = handlers.onDisconnectZapi;
    if (!connection || !canSetup || !disconnectZapi || busy) return;
    const actionGeneration = beginAction();
    const connectionId = connection.id;
    const result = await runAction({
      action: () => disconnectZapi(connectionId),
      busy: "disconnect",
      fallbackError:
        "Não foi possível desconectar o WhatsApp da Z-API. A conexão não foi marcada como desligada.",
      isCurrent: () => isCurrentAction(actionGeneration, connectionId),
      setBusy,
      setError,
    });
    if (result && isCurrentAction(actionGeneration, connectionId)) {
      onConnection(result);
    }
  };

  const disconnectBeforePairing = async () => {
    const disconnectZapi = handlers.onDisconnectZapi;
    if (!connection || !canSetup || !disconnectZapi || busy) return;
    const actionGeneration = beginAction();
    const connectionId = connection.id;
    const result = await runAction({
      action: () => disconnectZapi(connectionId),
      busy: "disconnect",
      fallbackError: "Não foi possível desconectar o aparelho na Z-API.",
      isCurrent: () => isCurrentAction(actionGeneration, connectionId),
      setBusy,
      setError,
    });
    if (!result) return;
    if (!isCurrentAction(actionGeneration, connectionId)) return;
    onConnection(result);
    setPairingBlock("waiting_disconnect");
  };

  const configureWebhooks = async () => {
    if (!connection || !canSetup || busy) return;
    const actionGeneration = beginAction();
    const connectionId = connection.id;
    const result = await runAction({
      action: () => handlers.onConfigureZapiWebhooks(connectionId),
      busy: "refresh",
      fallbackError:
        "Não foi possível verificar a configuração automática da Z-API.",
      isCurrent: () => isCurrentAction(actionGeneration, connectionId),
      setBusy,
      setError,
    });
    if (!result) return;
    if (!isCurrentAction(actionGeneration, connectionId)) return;
    onConnection(result.connection ?? { ...connection, setup: result.setup });
  };

  const requestQr = useCallback(async () => {
    const requestPairingQr = handlers.onRequestZapiPairingQr;
    const connectionId = connection?.id;
    if (!connectionId || !canPair || !requestPairingQr) return;
    const actionGeneration = beginAction();
    setQr(null);
    setBusy("qr");
    setError(null);
    try {
      const payload = await requestPairingQr(connectionId);
      if (isCurrentAction(actionGeneration, connectionId)) setQr(payload);
    } catch (caught) {
      if (!isCurrentAction(actionGeneration, connectionId)) return;
      if (requiresPhonePairing(caught)) {
        setPairingMethod("code");
        setError(
          "Este aparelho exige uma verificação adicional. Continue pelo telefone para concluir o pareamento com segurança.",
        );
      } else if (requiresProviderDisconnect(caught)) {
        setPairingBlock("disconnect_required");
      } else {
        setError(
          formatApiErrorDisplay(caught, "Não foi possível gerar o QR Code."),
        );
      }
    } finally {
      if (isCurrentAction(actionGeneration, connectionId)) setBusy(null);
    }
  }, [
    beginAction,
    canPair,
    connection?.id,
    handlers.onRequestZapiPairingQr,
    isCurrentAction,
  ]);

  useEffect(() => {
    if (
      pairingMethod !== "qr" ||
      !qr ||
      !qrExpired ||
      busy !== null ||
      !canPair ||
      !connection ||
      pairingBlock !== null ||
      document.visibilityState !== "visible"
    ) {
      return;
    }
    void requestQr();
  }, [
    busy,
    canPair,
    connection,
    pairingBlock,
    pairingMethod,
    qr,
    qrExpired,
    requestQr,
  ]);

  const requestCode = async () => {
    const requestPairingCode = handlers.onRequestZapiPairingCode;
    const connectionId = connection?.id;
    if (!connectionId || !canPair || !requestPairingCode) return;
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
      setError("Informe um telefone válido com DDI, DDD e número.");
      return;
    }
    const actionGeneration = beginAction();
    setPairingCode(null);
    setBusy("code");
    setError(null);
    try {
      const payload = await requestPairingCode(connectionId, normalizedPhone);
      if (isCurrentAction(actionGeneration, connectionId)) {
        setPairingCode(payload);
      }
    } catch (caught) {
      if (!isCurrentAction(actionGeneration, connectionId)) return;
      if (requiresProviderDisconnect(caught)) {
        setPairingBlock("disconnect_required");
      } else {
        setError(
          formatApiErrorDisplay(
            caught,
            "Não foi possível solicitar o código de pareamento.",
          ),
        );
      }
    } finally {
      if (isCurrentAction(actionGeneration, connectionId)) setBusy(null);
    }
  };

  return (
    <ConnectionSectionCard
      className="crm-zapi-guided-card"
      description="Uma jornada segura do cadastro das credenciais até o primeiro canal pronto."
      icon={<QrCode aria-hidden="true" />}
      title="Conectar WhatsApp · Z-API"
    >
      <ZapiSetupProgress step={step} />
      <div className="crm-zapi-stage">
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
            canDisconnect={canSetup && Boolean(handlers.onDisconnectZapi)}
            canPair={canPair && pairingBlock === null}
            codeExpired={codeExpired}
            method={pairingMethod}
            now={now}
            onMethodChange={setPairingMethod}
            onDisconnect={() => void disconnectBeforePairing()}
            onPhoneChange={setPhone}
            onRefresh={() => void refresh()}
            onRequestCode={() => void requestCode()}
            onRequestQr={() => void requestQr()}
            pairingCode={pairingCode}
            pairingBlock={pairingBlock}
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
          <p className="crm-connection-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button className="crm-zapi-back" onClick={onBack} type="button">
        <ArrowLeft aria-hidden="true" />
        Ver outros canais
      </button>
    </ConnectionSectionCard>
  );
}

function buildZapiConnectionInput(
  credentials: ZapiCredentialsDraft,
): CrmCreateConnectionInput {
  return {
    channel: "whatsapp",
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
      className="crm-zapi-credentials"
    >
      <div className="crm-zapi-stage-heading">
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
      <div className="crm-zapi-credential-fields">
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
        <p className="crm-connection-error" role="alert">
          {error}
        </p>
      ) : null}
      {!canSetup ? (
        <p className="crm-zapi-permission-note">
          Peça a um administrador da loja para cadastrar as credenciais.
        </p>
      ) : null}
      <button
        className="crm-connection-save"
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
    <div className="crm-connection-field">
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
