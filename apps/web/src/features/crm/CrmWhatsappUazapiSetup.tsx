import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { ConnectionSectionCard } from "./CrmConnectionAdminParts";
import {
  emptyUazapiProvisionDraft,
  readUazapiSetupStep,
  UazapiPairingStage,
  type UazapiPairingMethod,
  UazapiProvisionStage,
  type UazapiProvisionDraft,
  UazapiReadyState,
  UazapiSetupProgress,
  UazapiWebhookSetupStatus,
} from "./CrmWhatsappUazapiSetupParts";
import { isProviderDisconnected } from "./crmZapiPairingState";
import { type BusyState, runAction } from "./CrmWhatsappZapiCredentials";
import {
  refreshWhatsappSetupChannel,
  requestWhatsappPairingCode,
  requestWhatsappPairingQr,
} from "./crmWhatsappSetupActions";
import {
  type CrmWhatsappUazapiSetupProps,
  type PairingBlock,
  readUazapiConnectionStateKey,
} from "./CrmWhatsappUazapiSetupTypes";
import type { CrmCreateConnectionInput } from "./crmConversationTypes";

/**
 * Guided UAZAPI setup. Unlike Z-API there is no credentials stage: the
 * workspace provisions the instance server-side, so the journey starts at
 * provisioning and continues with webhooks and device pairing.
 */
export function CrmWhatsappUazapiSetup({
  canPair,
  canSetup,
  connection,
  handlers,
  onBack,
  onConnection,
}: CrmWhatsappUazapiSetupProps) {
  const [busy, setBusy] = useState<BusyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pairingCode, setPairingCode] = useState<{
    code?: string;
    expiresAt?: string;
  } | null>(null);
  const [pairingMethod, setPairingMethod] = useState<UazapiPairingMethod>("qr");
  const [pairingBlock, setPairingBlock] = useState<PairingBlock>(null);
  const [draft, setDraft] = useState<UazapiProvisionDraft>(
    emptyUazapiProvisionDraft,
  );
  const [phone, setPhone] = useState("");
  const [pairAgainForStateRevision, setPairAgainForStateRevision] = useState<
    number | null
  >(null);
  const [qr, setQr] = useState<{ expiresAt: string; qrCode: string } | null>(
    null,
  );
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
  const resolvedStep = readUazapiSetupStep({ connection });
  const qrExpired = Boolean(qr && new Date(qr.expiresAt).getTime() <= now);
  const codeExpired = Boolean(
    pairingCode?.expiresAt && new Date(pairingCode.expiresAt).getTime() <= now,
  );

  const connectionStateKey = readUazapiConnectionStateKey(connection);
  const previousConnectionStateKeyRef = useRef(connectionStateKey);
  const connectionStateRevisionRef = useRef(0);
  if (previousConnectionStateKeyRef.current !== connectionStateKey) {
    previousConnectionStateKeyRef.current = connectionStateKey;
    connectionStateRevisionRef.current += 1;
    actionGenerationRef.current += 1;
  }
  const step =
    pairAgainForStateRevision === connectionStateRevisionRef.current &&
    resolvedStep === 4
      ? 3
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
    setPhone(connection?.phoneNumber ?? "");
    setError(null);
  }, [connection?.id, connection?.phoneNumber]);

  useEffect(() => {
    if (!qr?.expiresAt && !pairingCode?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [pairingCode?.expiresAt, qr?.expiresAt]);

  useEffect(() => {
    if (step !== 2 && step !== 3 && step !== 4) return undefined;

    const refreshConnections = handlers.onRefreshConnections;
    const refreshUazapiStatus = handlers.onRefreshUazapiStatus;
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
        if ((step === 3 || step === 4) && connectionId && refreshUazapiStatus) {
          const refreshed = await refreshUazapiStatus(connectionId);
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
    handlers.onRefreshUazapiStatus,
    isCurrentAction,
    onConnection,
    step,
  ]);

  const provision = async () => {
    if (!canSetup) return;
    const displayName = draft.displayName.trim();
    if (!displayName) {
      setError("Informe um nome para identificar esta conexão no CRM.");
      return;
    }
    const normalizedPhone = draft.phone.replace(/\D/g, "");
    if (
      normalizedPhone &&
      (normalizedPhone.length < 8 || normalizedPhone.length > 15)
    ) {
      setError("Informe um telefone válido com DDI, DDD e número.");
      return;
    }
    const actionGeneration = beginAction();
    setBusy("credentials");
    setError(null);
    try {
      const input: CrmCreateConnectionInput = {
        channel: "whatsapp",
        displayName,
        provider: "uazapi",
        ...(normalizedPhone ? { connectionPhoneNumber: normalizedPhone } : {}),
      };
      const created = await handlers.onCreate(input);
      if (!created) {
        throw new Error(
          "A conexão não foi provisionada. Nenhuma instância foi confirmada pelo servidor.",
        );
      }
      if (!isCurrentAction(actionGeneration)) return;
      setDraft(emptyUazapiProvisionDraft);
      if (created.phoneNumber) setPhone(created.phoneNumber);
      onConnection(created);
    } catch (caught) {
      if (isCurrentAction(actionGeneration)) {
        setError(
          formatApiErrorDisplay(
            caught,
            "Não foi possível provisionar a conexão UAZAPI. Nenhuma instância foi confirmada.",
          ),
        );
      }
    } finally {
      if (isCurrentAction(actionGeneration)) setBusy(null);
    }
  };

  const refresh = async () => {
    await refreshWhatsappSetupChannel({
      beginAction,
      busy,
      connection,
      isCurrentAction,
      onConnection,
      refreshConnections: handlers.onRefreshConnections,
      refreshStatus: handlers.onRefreshUazapiStatus,
      setBusy,
      setError,
      setPairingBlock,
    });
  };

  const disconnect = async () => {
    const disconnectUazapi = handlers.onDisconnectUazapi;
    if (!connection || !canSetup || !disconnectUazapi || busy) return;
    const actionGeneration = beginAction();
    const connectionId = connection.id;
    const result = await runAction({
      action: () => disconnectUazapi(connectionId),
      busy: "disconnect",
      fallbackError:
        "Não foi possível desconectar o WhatsApp desta instância. A conexão não foi marcada como desligada.",
      isCurrent: () => isCurrentAction(actionGeneration, connectionId),
      setBusy,
      setError,
    });
    if (result && isCurrentAction(actionGeneration, connectionId)) {
      onConnection(result);
    }
  };

  const disconnectBeforePairing = async () => {
    const disconnectUazapi = handlers.onDisconnectUazapi;
    if (!connection || !canSetup || !disconnectUazapi || busy) return;
    const actionGeneration = beginAction();
    const connectionId = connection.id;
    const result = await runAction({
      action: () => disconnectUazapi(connectionId),
      busy: "disconnect",
      fallbackError: "Não foi possível desconectar o aparelho no provedor.",
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
    const configureUazapiWebhooks = handlers.onConfigureUazapiWebhooks;
    if (!connection || !canSetup || !configureUazapiWebhooks || busy) return;
    const actionGeneration = beginAction();
    const connectionId = connection.id;
    const result = await runAction({
      action: () => configureUazapiWebhooks(connectionId),
      busy: "refresh",
      fallbackError:
        "Não foi possível verificar a configuração automática do provedor.",
      isCurrent: () => isCurrentAction(actionGeneration, connectionId),
      setBusy,
      setError,
    });
    if (!result) return;
    if (!isCurrentAction(actionGeneration, connectionId)) return;
    onConnection(result.connection ?? { ...connection, setup: result.setup });
  };

  const requestQr = useCallback(async () => {
    await requestWhatsappPairingQr({
      beginAction,
      canPair,
      connectionId: connection?.id,
      isCurrentAction,
      requestPairingQr: handlers.onRequestUazapiPairingQr,
      setBusy,
      setError,
      setPairingBlock,
      setPairingMethod,
      setQr,
    });
  }, [
    beginAction,
    canPair,
    connection?.id,
    handlers.onRequestUazapiPairingQr,
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
    await requestWhatsappPairingCode({
      beginAction,
      canPair,
      connectionId: connection?.id,
      isCurrentAction,
      phone,
      requestPairingCode: handlers.onRequestUazapiPairingCode,
      setBusy,
      setError,
      setPairingBlock,
      setPairingCode,
    });
  };

  return (
    <ConnectionSectionCard
      className="crm-zapi-guided-card"
      description="Uma jornada segura do provisionamento automático até o canal pronto."
      icon={<QrCode aria-hidden="true" />}
      title="Conectar WhatsApp · UAZAPI"
    >
      <UazapiSetupProgress step={step} />
      <div className="crm-zapi-stage">
        {step === 1 && !connection ? (
          <UazapiProvisionStage
            busy={busy}
            canSubmit={canSetup}
            draft={draft}
            error={error}
            onChange={setDraft}
            onSave={() => void provision()}
          />
        ) : null}
        {step === 2 && connection ? (
          <UazapiWebhookSetupStatus
            canConfigure={
              canSetup && Boolean(handlers.onConfigureUazapiWebhooks)
            }
            connection={connection}
            isRefreshing={busy === "refresh"}
            onRefresh={() => void configureWebhooks()}
          />
        ) : null}
        {step === 3 && connection ? (
          <UazapiPairingStage
            busy={busy}
            canDisconnect={canSetup && Boolean(handlers.onDisconnectUazapi)}
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
        {step === 4 && connection ? (
          <UazapiReadyState
            canDisconnect={canSetup && Boolean(handlers.onDisconnectUazapi)}
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
        {step !== 1 && step !== 2 && error ? (
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
