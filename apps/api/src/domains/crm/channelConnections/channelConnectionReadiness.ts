import type {
  CrmConnection,
  CrmConnectionProvider,
} from "../ports/crmConnectionRepository.js";
import type { CrmConnectionReadiness } from "@lojaveiculosv2/shared";
import type { CrmChannelConnectionLiveStatus } from "./channelConnectionModels.js";
import type { ZapiWebhookSetupState } from "../whatsapp/zapiWebhookSetupState.js";

export function isConnectionReady(
  connection: CrmConnection,
  live: CrmChannelConnectionLiveStatus,
  setup: ZapiWebhookSetupState | null,
) {
  if (connection.status !== "active" || live.connected !== true) return false;
  if (connection.provider === "zapi") return setup?.status === "configured";
  if (connection.provider === "olx") {
    const webhookSetup = readRecord(connection.metadata.webhookSetup);
    const capabilities = readRecord(webhookSetup.capabilities);
    return readRecord(capabilities.chat).status === "active";
  }
  return true;
}

export function readinessFor(
  connection: CrmConnection,
  live: CrmChannelConnectionLiveStatus,
  setup: ZapiWebhookSetupState | null,
  ready: boolean,
): CrmConnectionReadiness {
  if (ready) return { ready: true, reason: null, reasonCode: "ready" };
  if (connection.status === "paused") {
    return { ready: false, reason: "Conexão pausada.", reasonCode: "paused" };
  }
  if (connection.status === "error" || live.providerStatus === "error") {
    return {
      ready: false,
      reason: "O provedor retornou erro.",
      reasonCode: "provider_error",
    };
  }
  if (connection.provider === "zapi" && setup?.status !== "configured") {
    return {
      ready: false,
      reason: "A confirmação do webhook ainda está pendente.",
      reasonCode: "pending_webhook",
    };
  }
  if (live.connected !== true) {
    return {
      ready: false,
      reason: "Conclua a autenticação do provedor.",
      reasonCode: "disconnected",
    };
  }
  if (connection.provider === "olx") {
    return {
      ready: false,
      reason: "O OLX Chat aguarda confirmação do webhook.",
      reasonCode: "pending_webhook",
    };
  }
  return {
    ready: false,
    reason: "A autorização externa não está pronta para o CRM.",
    reasonCode: "not_authorized",
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
