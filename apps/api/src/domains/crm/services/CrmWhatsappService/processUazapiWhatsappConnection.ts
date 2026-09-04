import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmRealtimePublisher,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { parseUazapiConnection } from "../../whatsapp/parseUazapiWebhookEvents.js";
import {
  auditUazapiWebhook,
  readUazapiConnection,
  type UazapiWebhookInput,
  type UazapiWebhookResult,
} from "./uazapiWebhookSupport.js";
import { persistInitialReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";

const permission = "crm.messages.ingest";

export class CrmUazapiPhoneConflictError extends Error {
  constructor() {
    super("This phone number is already connected to WhatsApp in this store.");
    this.name = "CrmUazapiPhoneConflictError";
  }
}

export async function processUazapiWhatsappConnection(
  context: ServiceContext,
  input: UazapiWebhookInput,
  ports: CrmServicePorts,
): Promise<UazapiWebhookResult> {
  assertPermission(context, permission);
  const parsed = parseUazapiConnection(input.payload);
  const connection = await readUazapiConnection(
    context,
    input.connectionId,
    ports,
  );
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  if (parsed.status === null) {
    await auditUazapiWebhook(context, connection, "connection", {
      ignoredReason: "provider_connection_evidence_missing",
    });
    return { reason: "connection_evidence_missing", status: "ignored" };
  }

  try {
    await getCrmConnectionRepository(ports).updateConnection({
      connectionId: connection.id,
      metadata: {
        ...connection.metadata,
        connected: parsed.status === "active",
        [parsed.status === "active" ? "lastConnectedAt" : "lastDisconnectedAt"]:
          new Date().toISOString(),
        providerConnected: parsed.status === "active",
      },
      ...(parsed.connectedPhone ? { phone: parsed.connectedPhone } : {}),
      status: parsed.status,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
  } catch (error) {
    if (isPhoneUniqueViolation(error)) {
      throw new CrmUazapiPhoneConflictError();
    }
    throw error;
  }

  if (
    parsed.status === "active" &&
    ports.crmRoutingConnectionRepository &&
    ports.crmRoutingPolicyRepository
  ) {
    await persistInitialReadyChannelDefault(
      context,
      { channel: "whatsapp", connectionId: connection.id },
      ports,
    );
  }
  await auditUazapiWebhook(context, connection, "connection", {
    status: parsed.status,
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    phone: parsed.connectedPhone ?? connection.phone,
    status: parsed.status,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "connection_status",
  });
  return { status: "accepted" };
}

function isPhoneUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "23505") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /unique/iu.test(message) && /phone/iu.test(message);
}
