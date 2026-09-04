import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmRealtimePublisher,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmMessageStatus } from "../../ports/crmConversationRepository.js";
import { parseUazapiStatusUpdates } from "../../whatsapp/parseUazapiWebhookEvents.js";
import {
  auditUazapiWebhook,
  readUazapiConnection,
  type UazapiWebhookInput,
  type UazapiWebhookResult,
} from "./uazapiWebhookSupport.js";
import { updateReadSessionState } from "./updateReadSessionState.js";

const permission = "crm.messages.ingest";
const statusRank: Record<CrmMessageStatus, number> = {
  FAILED: 5,
  READ: 4,
  DELIVERED: 3,
  SENT: 2,
  PENDING: 1,
};

export async function processUazapiWhatsappMessage(
  context: ServiceContext,
  input: UazapiWebhookInput,
  ports: CrmServicePorts,
): Promise<UazapiWebhookResult> {
  assertPermission(context, permission);
  const updates = parseUazapiStatusUpdates(input.payload).filter(
    (update) => update.status !== null,
  );
  if (updates.length === 0) {
    return { reason: "missing_message_id", status: "ignored" };
  }
  const connection = await readUazapiConnection(
    context,
    input.connectionId,
    ports,
  );
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  const repository = getCrmConversationRepository(ports);
  let processed = 0;
  for (const update of updates) {
    const status = update.status;
    if (!status) continue;
    const message = await repository.findMessageByExternalId({
      connectionId: connection.id,
      externalId: update.externalId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    if (!message || !shouldApplyStatus(message.status, status)) continue;
    await repository.updateMessage({
      messageId: message.id,
      metadata: {
        ...message.metadata,
        providerStatus: update.providerStatus ?? "unknown",
      },
      status,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    const realtimeState = await updateReadSessionState(
      repository,
      message,
      status,
    );
    await getCrmRealtimePublisher(ports).publish({
      assignedUserId: realtimeState.assignedUserId,
      connectionId: connection.id,
      ...(realtimeState.lastCustomerReadAt
        ? { lastCustomerReadAt: realtimeState.lastCustomerReadAt }
        : {}),
      messageId: message.id,
      cycleId: message.cycleId,
      status,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      type: "message_status",
    });
    processed++;
  }
  await auditUazapiWebhook(context, connection, "status", { processed });
  return { processed, status: "accepted" };
}

function shouldApplyStatus(current: CrmMessageStatus, next: CrmMessageStatus) {
  if (current === "FAILED" && next !== "FAILED") return false;
  if (next === "FAILED") return current === "PENDING" || current === "SENT";
  return statusRank[next] >= statusRank[current];
}
