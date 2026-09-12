import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { CrmMessagingCapabilityError } from "../ports/crmMessagingGateway.js";
import type {
  CrmConversationRepository,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";

const officialServiceWindowMs = 24 * 60 * 60 * 1_000;

export async function assertOfficialMessagingWindow(
  connection: CrmConnection,
  conversationCycle: CrmConversationCycle,
  repository: CrmConversationRepository,
  now = new Date(),
) {
  if (connection.provider === "zapi" || connection.provider === "olx") {
    return;
  }
  const [latestInbound] = await repository.listMessages({
    direction: "INBOUND",
    limit: 1,
    offset: 0,
    cycleId: conversationCycle.id,
    storeId: conversationCycle.storeId,
    tenantId: conversationCycle.tenantId,
  });
  const lastCustomerMessageAt =
    latestInbound?.providerTimestamp ?? latestInbound?.createdAt ?? null;
  if (
    lastCustomerMessageAt &&
    now.getTime() - lastCustomerMessageAt.getTime() <= officialServiceWindowMs
  ) {
    return;
  }

  throw new CrmMessagingCapabilityError(
    connection.channel === "whatsapp"
      ? "Official WhatsApp free-form sends require an open 24-hour customer service window. Use an approved template to reopen the conversation."
      : "Instagram replies require a customer message within the last 24 hours.",
  );
}
