import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode } from "lucide-react";
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
import {
  isProviderDisconnected,
  requiresPhonePairing,
  requiresProviderDisconnect,
} from "./crmZapiPairingState";
import {
  buildZapiConnectionInput,
  type BusyState,
  CredentialsStage,
  emptyCredentials,
  RepairCredentialsButton,
  runAction,
  type ZapiCredentialsDraft,
} from "./CrmWhatsappZapiCredentials";
import {
  type CrmWhatsappZapiSetupProps,
  type PairingBlock,
  readZapiConnectionStateKey,
} from "./CrmWhatsappZapiSetupTypes";

export function CrmWhatsappZapiSetup({
  allowance,
  canPair,
  canSetup,
  canRepairCredentials = false,
  connection,
  handlers,
  onBack,
  onConnection,
  zapiAddonContract,
}: CrmWhatsappZapiSetupProps) {
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
  const [pairAgainForStateRevision, setPairAgainForStateRevision] = useState<
    number | null
  >(null);
  const [qr, setQr] = useState<{ expiresAt: string; qrCode: string } | null>(
    null,
  );
  const [showCredentials, setShowCredentials] = useState(false);
  const [showRepairCredentials, setShowRepairCredentials] = useState(false);
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
  const qrExpired = Boolean(qr && new Date(qr.expiresAt).getTime() <= now);
  const codeExpired = Boolean(
    pairingCode?.expiresAt && new Date(pairingCode.expiresAt).getTime() <= now,
  );

  const connectionStateKey = readZapiConnectionStateKey(connection);
  const previousConnectionStateKeyRef = useRef(connectionStateKey);
  const connectionStateRevisionRef = useRef(0);
  if (previousConnectionStateKeyRef.current !== connectionStateKey) {
    previousConnectionStateKeyRef.current = connectionStateKey;
    connectionStateRevisionRef.current += 1;
    actionGenerationRef.current += 1;
  }
  const step =
    pairAgainForStateRevision === connectionStateRevisionRef.current &&
    resolvedStep === 5
      ? 4
      : resolvedStep;

  useEffect(() => {
    autoRefreshInFlightRef.current = false;
    setBusy(null);
    setError(null);
    setPairingCode(null);
    setQr(null);
    setNow(Date.now());
  }, [connectionStateKey]);

  useEffect(() => {
    setPairingBlock(null);
    setPairingMethod("qr");
    setPhone("");
    setShowRepairCredentials(false);
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
    const repairingConnection = showRepairCredentials ? connection : null;
    if (repairingConnection ? !canRepairCredentials : !canSetup) return;
    if (!credentials.instanceId.trim() || !credentials.instanceToken.trim()) {
      setError("Informe o ID e o token da instância Z-API.");
      return;
    }
    if (repairingConnection && !handlers.onRepairZapiCredentials) {
      setError(
        "A atualização segura das credenciais não está disponível neste momento.",
      );
      return;
    }
    const actionGeneration = beginAction();
    setBusy("credentials");
    setError(null);
    try {
      const updated = repairingConnection
        ? await handlers.onRepairZapiCredentials!(repairingConnection.id, {
            instanceId: credentials.instanceId.trim(),
            instanceToken: credentials.instanceToken.trim(),
          })
        : await handlers.onCreate(buildZapiConnectionInput(credentials));
      if (!updated) {
        throw new Error(
          repairingConnection
            ? "A conexão não foi reparada. Nenhuma credencial foi alterada."
            : "A conexão não foi criada. Nenhuma credencial foi confirmada.",
        );
      }
      if (!isCurrentAction(actionGeneration)) return;
      setCredentials(emptyCredentials);
      setShowRepairCredentials(false);
      onConnection(updated);
    } catch (caught) {
      if (isCurrentAction(actionGeneration)) {
        setError(
          formatApiErrorDisplay(
            caught,
            repairingConnection
              ? "Não foi possível atualizar as credenciais da conexão."
              : "Não foi possível salvar a conexão Z-API.",
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
            canSubmit={canSetup}
            credentials={credentials}
            error={error}
            onChange={setCredentials}
            onSave={() => void saveCredentials()}
            onToggleVisibility={() => setShowCredentials((current) => !current)}
            showCredentials={showCredentials}
          />
        ) : null}
        {(step === 3 || step === 4) && connection && showRepairCredentials ? (
          <CredentialsStage
            busy={busy}
            canSubmit={canRepairCredentials}
            credentials={credentials}
            error={error}
            mode="repair"
            onCancel={() => {
              setCredentials(emptyCredentials);
              setError(null);
              setShowRepairCredentials(false);
            }}
            onChange={setCredentials}
            onSave={() => void saveCredentials()}
            onToggleVisibility={() => setShowCredentials((current) => !current)}
            showCredentials={showCredentials}
          />
        ) : null}
        {step === 3 && connection && !showRepairCredentials ? (
          <>
            <ZapiWebhookSetupStatus
              canConfigure={canSetup}
              connection={connection}
              isRefreshing={busy === "refresh"}
              onRefresh={() => void configureWebhooks()}
            />
            <RepairCredentialsButton
              busy={busy}
              canRepair={canRepairCredentials}
              enabled={Boolean(handlers.onRepairZapiCredentials)}
              onClick={() => {
                setError(null);
                setShowRepairCredentials(true);
              }}
            />
          </>
        ) : null}
        {step === 4 && connection && !showRepairCredentials ? (
          <>
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
            <RepairCredentialsButton
              busy={busy}
              canRepair={canRepairCredentials}
              enabled={Boolean(handlers.onRepairZapiCredentials)}
              onClick={() => {
                setError(null);
                setShowRepairCredentials(true);
              }}
            />
          </>
        ) : null}
        {step === 5 && connection ? (
          <ZapiReadyState
            canDisconnect={canSetup && Boolean(handlers.onDisconnectZapi)}
            connection={connection}
            isDisconnecting={busy === "disconnect"}
            onDisconnect={() => void disconnect()}
            {...(canPair
              ? {
                  onPairAgain: () =>
                    setPairAgainForStateRevision(
                      connectionStateRevisionRef.current,
                    ),
                }
              : {})}
          />
        ) : null}
        {step !== 2 && !showRepairCredentials && error ? (
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
