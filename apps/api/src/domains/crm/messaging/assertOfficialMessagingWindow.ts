import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { CrmWhatsappCapabilityError } from "../ports/crmWhatsappGateway.js";
import type {
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";

const officialServiceWindowMs = 24 * 60 * 60 * 1_000;

export async function assertOfficialMessagingWindow(
  connection: CrmConnection,
  session: CrmWhatsappSession,
  repository: CrmWhatsappRepository,
  now = new Date(),
) {
  if (connection.provider === "zapi") return;
  const [latestInbound] = await repository.listMessages({
    direction: "INBOUND",
    limit: 1,
    offset: 0,
    sessionId: session.id,
    storeId: session.storeId,
    tenantId: session.tenantId,
  });
  const lastCustomerMessageAt =
    latestInbound?.providerTimestamp ?? latestInbound?.createdAt ?? null;
  if (
    lastCustomerMessageAt &&
    now.getTime() - lastCustomerMessageAt.getTime() <= officialServiceWindowMs
  ) {
    return;
  }

  throw new CrmWhatsappCapabilityError(
    connection.provider === "composio_whatsapp"
      ? "Official WhatsApp free-form sends require an open 24-hour customer service window. Use an approved template to reopen the conversation."
      : "Instagram replies require a customer message within the last 24 hours.",
  );
}
