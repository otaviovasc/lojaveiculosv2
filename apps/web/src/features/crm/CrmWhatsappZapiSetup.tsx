import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode } from "lucide-react";
import { AppApiError, formatApiErrorDisplay } from "../../lib/apiErrors";
import { ConnectionSectionCard } from "./CrmConnectionAdminParts";
import {
  CrmWhatsappZapiPairingStage,
  type ZapiPairingMethod,
} from "./CrmWhatsappZapiPairingStage";
import {
  readZapiSetupStep,
  ZapiReadyState,
  ZapiSetupProgress,
  ZapiWebhookSetupStatus,
} from "./CrmWhatsappZapiSetupParts";
import { isProviderDisconnected } from "./crmZapiPairingState";
import {
  refreshWhatsappSetupChannel,
  requestWhatsappPairingCode,
  requestWhatsappPairingQr,
} from "./crmWhatsappSetupActions";
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
import type { CrmProviderConnection } from "./crmConversationTypes";

export function CrmWhatsappZapiSetup({
  canPair,
  canSetup,
  canRepairCredentials = false,
  connection,
  handlers,
  initialCredentialMode,
  onBack,
  onConnection,
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
  const [showReplacementCredentials, setShowReplacementCredentials] =
    useState(false);
  const credentialModeAfterConnectionRef = useRef<
    "repair" | "replacement" | null
  >(null);
  const errorAfterConnectionChangeRef = useRef<string | null>(null);
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
  const resolvedStep = readZapiSetupStep({ connection });
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
    setPhone("");
    const pendingMode = credentialModeAfterConnectionRef.current;
    const pendingError = errorAfterConnectionChangeRef.current;
    credentialModeAfterConnectionRef.current = null;
    errorAfterConnectionChangeRef.current = null;
    setShowRepairCredentials(
      pendingMode === "repair" || initialCredentialMode === "repair",
    );
    setShowReplacementCredentials(
      pendingMode === "replacement" || initialCredentialMode === "replacement",
    );
    setError(pendingError);
  }, [connection?.id, initialCredentialMode]);

  useEffect(() => {
    if (!qr?.expiresAt && !pairingCode?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [pairingCode?.expiresAt, qr?.expiresAt]);

  useEffect(() => {
    if (step !== 2 && step !== 3 && step !== 4) return undefined;

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
        if ((step === 3 || step === 4) && connectionId && refreshZapiStatus) {
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

  const saveCredentials = async () => {
    const repairingConnection =
      showRepairCredentials || showReplacementCredentials ? connection : null;
    if (repairingConnection ? !canRepairCredentials : !canSetup) return;
    if (
      !credentials.instanceId.trim() ||
      !credentials.instanceToken.trim() ||
      !credentials.clientToken.trim()
    ) {
      setError("Informe as três credenciais da conexão Z-API.");
      return;
    }
    if (showRepairCredentials && !handlers.onRepairZapiCredentials) {
      setError(
        "A atualização segura das credenciais não está disponível neste momento.",
      );
      return;
    }
    if (showReplacementCredentials && !handlers.onReplaceZapiConnection) {
      setError(
        "A troca segura da instância não está disponível neste momento.",
      );
      return;
    }
    const actionGeneration = beginAction();
    setBusy("credentials");
    setError(null);
    try {
      const updated = showReplacementCredentials
        ? (
            await handlers.onReplaceZapiConnection!(repairingConnection!.id, {
              expectedRevision: repairingConnection!.revision ?? 0,
              idempotencyKey: crypto.randomUUID(),
              clientToken: credentials.clientToken.trim(),
              instanceId: credentials.instanceId.trim(),
              instanceToken: credentials.instanceToken.trim(),
            })
          ).connection
        : repairingConnection
          ? await handlers.onRepairZapiCredentials!(repairingConnection.id, {
              ...(repairingConnection.revision !== undefined
                ? { expectedRevision: repairingConnection.revision }
                : {}),
              clientToken: credentials.clientToken.trim(),
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
      setShowReplacementCredentials(false);
      onConnection(updated);
    } catch (caught) {
      if (isCurrentAction(actionGeneration)) {
        if (
          caught instanceof AppApiError &&
          isExistingZapiConflictCode(caught.code, caught.details)
        ) {
          const details = readConflictDetails(caught.details);
          let refreshed: readonly CrmProviderConnection[] | undefined;
          try {
            if (handlers.onRefreshConnectionsWithPayload) {
              refreshed =
                (await handlers.onRefreshConnectionsWithPayload()) ?? undefined;
            } else {
              await handlers.onRefreshConnections();
            }
          } catch {
            setError(
              "A conexão Z-API já existe, mas não foi possível atualizar a lista de conexões. Tente novamente.",
            );
            return;
          }
          const existing = refreshed?.find(
            (candidate) =>
              candidate.provider === "zapi" &&
              (details?.connectionId === undefined ||
                String(candidate.id) === details.connectionId) &&
              (candidate.state ?? candidate.status) !== "archived",
          );
          if (existing) {
            if (canRepairCredentials && handlers.onRepairZapiCredentials) {
              credentialModeAfterConnectionRef.current =
                details?.nextAction === "replace_instance"
                  ? "replacement"
                  : "repair";
            }
            onConnection(existing);
            setCredentials(emptyCredentials);
            if (canRepairCredentials && handlers.onRepairZapiCredentials) {
              setShowRepairCredentials(
                details?.nextAction !== "replace_instance",
              );
              setShowReplacementCredentials(
                details?.nextAction === "replace_instance",
              );
              setError(null);
            } else {
              const message =
                "A conexão existente foi localizada. Um administrador da loja precisa concluir o reparo das credenciais.";
              errorAfterConnectionChangeRef.current = message;
              setError(message);
            }
          } else {
            setError(
              "A conexão Z-API já existe, mas não foi possível carregá-la agora. Atualize esta tela e abra a conexão existente para reparar as credenciais.",
            );
          }
          return;
        }
        if (
          caught instanceof AppApiError &&
          (caught.code === "CRM_ZAPI_CONNECTION_REPAIR_REQUIRED" ||
            caught.code === "CRM_ZAPI_CONNECTION_REPLACEMENT_REQUIRED")
        ) {
          const details = readConflictDetails(caught.details);
          let refreshed: readonly CrmProviderConnection[] | undefined;
          try {
            if (handlers.onRefreshConnectionsWithPayload) {
              refreshed =
                (await handlers.onRefreshConnectionsWithPayload()) ?? undefined;
            } else {
              await handlers.onRefreshConnections();
            }
          } catch {
            setError(
              "A conexão Z-API foi encontrada, mas não foi possível atualizar a lista de conexões. Tente novamente.",
            );
            return;
          }
          const exact = refreshed?.find(
            (candidate) => String(candidate.id) === details?.connectionId,
          );
          if (exact) {
            if (canRepairCredentials) {
              credentialModeAfterConnectionRef.current =
                caught.code === "CRM_ZAPI_CONNECTION_REPLACEMENT_REQUIRED"
                  ? "replacement"
                  : "repair";
            }
            onConnection(exact);
            if (
              canRepairCredentials &&
              caught.code === "CRM_ZAPI_CONNECTION_REPAIR_REQUIRED"
            ) {
              setShowRepairCredentials(true);
            } else if (
              canRepairCredentials &&
              caught.code === "CRM_ZAPI_CONNECTION_REPLACEMENT_REQUIRED"
            ) {
              setShowReplacementCredentials(true);
            } else {
              const message =
                "A conexão foi encontrada. Um administrador da loja precisa concluir esta operação.";
              errorAfterConnectionChangeRef.current = message;
              setError(message);
            }
          } else {
            setError(
              "A conexão Z-API foi encontrada, mas ainda não apareceu na lista. Atualize as conexões e tente novamente.",
            );
          }
          return;
        }
        setError(
          formatApiErrorDisplay(
            caught,
            repairingConnection
              ? showReplacementCredentials
                ? "Não foi possível trocar a instância Z-API. A conexão atual foi preservada."
                : "Não foi possível atualizar as credenciais da conexão."
              : "Não foi possível salvar a conexão Z-API.",
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
      refreshStatus: handlers.onRefreshZapiStatus,
      setBusy,
      setError,
      setPairingBlock,
    });
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
    await requestWhatsappPairingQr({
      beginAction,
      canPair,
      connectionId: connection?.id,
      isCurrentAction,
      requestPairingQr: handlers.onRequestZapiPairingQr,
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
    await requestWhatsappPairingCode({
      beginAction,
      canPair,
      connectionId: connection?.id,
      isCurrentAction,
      phone,
      requestPairingCode: handlers.onRequestZapiPairingCode,
      setBusy,
      setError,
      setPairingBlock,
      setPairingCode,
    });
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
        {step === 1 && !connection ? (
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
        {(step === 1 || step === 2 || step === 3) &&
        connection &&
        (showRepairCredentials || showReplacementCredentials) ? (
          <CredentialsStage
            busy={busy}
            canSubmit={canRepairCredentials}
            credentials={credentials}
            error={error}
            mode={showReplacementCredentials ? "replacement" : "repair"}
            onCancel={() => {
              setCredentials(emptyCredentials);
              setError(null);
              setShowRepairCredentials(false);
              setShowReplacementCredentials(false);
            }}
            onChange={setCredentials}
            onSave={() => void saveCredentials()}
            onToggleVisibility={() => setShowCredentials((current) => !current)}
            showCredentials={showCredentials}
          />
        ) : null}
        {step === 2 &&
        connection &&
        !showRepairCredentials &&
        !showReplacementCredentials ? (
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
        {step === 3 &&
        connection &&
        !showRepairCredentials &&
        !showReplacementCredentials ? (
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
        {(step === 2 || step === 3) &&
        connection &&
        !showRepairCredentials &&
        !showReplacementCredentials &&
        handlers.onReplaceZapiConnection ? (
          <button
            className="crm-action crm-action-secondary"
            disabled={!canRepairCredentials || busy !== null}
            onClick={() => {
              setError(null);
              setShowReplacementCredentials(true);
            }}
            type="button"
          >
            Trocar instância desta loja
          </button>
        ) : null}
        {step === 4 && connection ? (
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
        {step !== 1 &&
        step !== 2 &&
        !showRepairCredentials &&
        !showReplacementCredentials &&
        error ? (
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

function readConflictDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const details = value as Record<string, unknown>;
  const provider =
    details.provider === "zapi" ||
    details.provider === "meta_cloud" ||
    details.provider === "olx"
      ? details.provider
      : undefined;
  const connectionId =
    typeof details.connectionId === "string" ? details.connectionId : undefined;
  const nextAction =
    details.nextAction === "repair_credentials" ||
    details.nextAction === "replace_instance"
      ? details.nextAction
      : undefined;
  return connectionId || nextAction || provider
    ? { connectionId, nextAction, provider }
    : null;
}

function isExistingZapiConflictCode(
  code: string | undefined,
  details: unknown,
) {
  if (code === "CRM_ZAPI_CREDENTIAL_PARTIAL_STATE") return true;
  return (
    code === "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS" &&
    readConflictDetails(details)?.provider === "zapi"
  );
}
