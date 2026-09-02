import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { ConnectionSectionCard } from "./CrmConnectionAdminParts";
import {
  emptyUazapiProvisionDraft,
  readUazapiSetupStep,
  UazapiAccountStage,
  UazapiInstanceStage,
  UazapiPairingStage,
  type UazapiPairingMethod,
  type UazapiProvisionDraft,
  type UazapiProvisionMode,
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
import type {
  CrmCreateConnectionInput,
  CrmUazapiInstanceSummary,
} from "./crmConversationTypes";

/**
 * Guided UAZAPI setup. The journey starts by validating the store-owned
 * uazapi admin token (a write-only credential kept in local wizard state
 * until the create call), then provisions a new instance or attaches an
 * existing one, and continues with webhooks and device pairing.
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
  const [provisionStage, setProvisionStage] = useState<"account" | "instance">(
    "account",
  );
  const [instances, setInstances] = useState<
    readonly CrmUazapiInstanceSummary[] | null
  >(null);
  const [provisionMode, setProvisionMode] =
    useState<UazapiProvisionMode>("create");
  const [selectedInstanceId, setSelectedInstanceId] = useState<
    string | undefined
  >(undefined);
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
    setProvisionStage("account");
    setInstances(null);
    setProvisionMode("create");
    setSelectedInstanceId(undefined);
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

  const validateAccount = async () => {
    const listInstances = handlers.onListUazapiInstances;
    if (!canSetup || !listInstances) return;
    const adminToken = draft.adminToken.trim();
    if (!adminToken) {
      setError("Informe o token admin da conta uazapi da loja.");
      return;
    }
    const baseUrl = draft.baseUrl.trim();
    const actionGeneration = beginAction();
    setBusy("credentials");
    setError(null);
    try {
      const listed = await listInstances({
        adminToken,
        ...(baseUrl ? { baseUrl } : {}),
      });
      if (!isCurrentAction(actionGeneration)) return;
      setInstances(listed);
      setProvisionMode("create");
      setSelectedInstanceId(undefined);
      setProvisionStage("instance");
    } catch (caught) {
      if (isCurrentAction(actionGeneration)) {
        setError(
          formatApiErrorDisplay(
            caught,
            "Não foi possível validar o token admin. Nenhuma instância foi listada ou alterada.",
          ),
        );
      }
    } finally {
      if (isCurrentAction(actionGeneration)) setBusy(null);
    }
  };

  const provision = async () => {
    if (!canSetup) return;
    const displayName = draft.displayName.trim();
    if (!displayName) {
      setError("Informe um nome para identificar esta conexão no CRM.");
      return;
    }
    const adminToken = draft.adminToken.trim();
    if (!adminToken) {
      setError("Informe o token admin da conta uazapi da loja.");
      return;
    }
    if (provisionMode === "attach" && !selectedInstanceId) {
      setError("Selecione a instância existente que receberá esta conexão.");
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
    const baseUrl = draft.baseUrl.trim();
    const actionGeneration = beginAction();
    setBusy("credentials");
    setError(null);
    try {
      const shared = {
        adminToken,
        channel: "whatsapp" as const,
        displayName,
        provider: "uazapi" as const,
        ...(baseUrl ? { baseUrl } : {}),
      };
      // The attach contract does not accept connectionPhoneNumber: the
      // existing instance already owns its number, so the pairing phone is
      // only sent when a new instance is created.
      const input: CrmCreateConnectionInput =
        provisionMode === "attach"
          ? { ...shared, instanceId: selectedInstanceId ?? "", mode: "attach" }
          : {
              ...shared,
              mode: "create",
              ...(normalizedPhone
                ? { connectionPhoneNumber: normalizedPhone }
                : {}),
            };
      const created = await handlers.onCreate(input);
      if (!created) {
        throw new Error(
          "A conexão não foi provisionada. Nenhuma instância foi confirmada pelo servidor.",
        );
      }
      if (!isCurrentAction(actionGeneration)) return;
      setDraft(emptyUazapiProvisionDraft);
      setInstances(null);
      setSelectedInstanceId(undefined);
      setProvisionMode("create");
      setProvisionStage("account");
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
        {step === 1 && !connection && provisionStage === "account" ? (
          <UazapiAccountStage
            busy={busy}
            canSubmit={canSetup && Boolean(handlers.onListUazapiInstances)}
            draft={draft}
            error={error}
            onChange={setDraft}
            onValidate={() => void validateAccount()}
          />
        ) : null}
        {step === 1 && !connection && provisionStage === "instance" ? (
          <UazapiInstanceStage
            busy={busy}
            canSubmit={canSetup}
            draft={draft}
            error={error}
            instances={instances ?? []}
            mode={provisionMode}
            onBack={() => {
              setProvisionStage("account");
              setError(null);
            }}
            onChange={setDraft}
            onModeChange={setProvisionMode}
            onSelectInstance={setSelectedInstanceId}
            onSubmit={() => void provision()}
            selectedInstanceId={selectedInstanceId}
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
