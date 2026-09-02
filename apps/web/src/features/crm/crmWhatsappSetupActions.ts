import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  isProviderDisconnected,
  requiresPhonePairing,
  requiresProviderDisconnect,
} from "./crmZapiPairingState";
import { type BusyState, runAction } from "./CrmWhatsappZapiCredentials";
import type { CrmProviderConnection } from "./crmConversationTypes";
import type { PairingBlock } from "./CrmWhatsappZapiSetupTypes";
import type { WhatsappPairingMethod } from "./CrmWhatsappSetupParts.shared";

type SetupActionGuards = {
  beginAction: () => number;
  isCurrentAction: (generation: number, connectionId?: string) => boolean;
  setBusy: (busy: BusyState | null) => void;
  setError: (error: string | null) => void;
};

export async function refreshWhatsappSetupChannel({
  beginAction,
  busy,
  connection,
  isCurrentAction,
  onConnection,
  refreshConnections,
  refreshStatus,
  setBusy,
  setError,
  setPairingBlock,
}: SetupActionGuards & {
  busy: BusyState | null;
  connection: CrmProviderConnection | null | undefined;
  onConnection: (connection: CrmProviderConnection) => void;
  refreshConnections: () => Promise<unknown>;
  refreshStatus?:
    ((connectionId: string) => Promise<CrmProviderConnection>) | undefined;
  setPairingBlock: (block: PairingBlock) => void;
}) {
  if (busy) return;
  const currentConnection = connection;
  const actionGeneration = beginAction();
  const connectionId = currentConnection?.id;
  const refresh = currentConnection ? refreshStatus : undefined;
  if (refresh && currentConnection) {
    const result = await runAction({
      action: () => refresh(currentConnection.id),
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
      action: refreshConnections,
      busy: "refresh",
      fallbackError: "Não foi possível atualizar o canal.",
      isCurrent: () => isCurrentAction(actionGeneration),
      setBusy,
      setError,
    });
  }
}

export async function requestWhatsappPairingQr({
  beginAction,
  canPair,
  connectionId,
  isCurrentAction,
  requestPairingQr,
  setBusy,
  setError,
  setPairingBlock,
  setPairingMethod,
  setQr,
}: SetupActionGuards & {
  canPair: boolean;
  connectionId: string | undefined;
  requestPairingQr:
    | ((connectionId: string) => Promise<{ expiresAt: string; qrCode: string }>)
    | undefined;
  setPairingBlock: (block: PairingBlock) => void;
  setPairingMethod: (method: WhatsappPairingMethod) => void;
  setQr: (qr: { expiresAt: string; qrCode: string } | null) => void;
}) {
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
}

export async function requestWhatsappPairingCode({
  beginAction,
  canPair,
  connectionId,
  isCurrentAction,
  phone,
  requestPairingCode,
  setBusy,
  setError,
  setPairingBlock,
  setPairingCode,
}: SetupActionGuards & {
  canPair: boolean;
  connectionId: string | undefined;
  phone: string;
  requestPairingCode:
    | ((
        connectionId: string,
        phone: string,
      ) => Promise<{ code?: string; expiresAt?: string; requested: boolean }>)
    | undefined;
  setPairingBlock: (block: PairingBlock) => void;
  setPairingCode: (
    pairingCode: { code?: string; expiresAt?: string } | null,
  ) => void;
}) {
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
}
