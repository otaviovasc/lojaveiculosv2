import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertOfficialMessagingWindow } from "./assertOfficialMessagingWindow.js";
import type { CrmConversationCycle } from "../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  isCrmOlxChatEnabled,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { assertProviderEffectAllowed } from "./assertProviderEffectAllowed.js";
import { CrmConnectionNotFoundError } from "./crmMessagingErrors.js";
import { resolveCrmProviderOperation } from "../services/CrmRoutingService/resolveCrmProviderOperation.js";
import type { CrmRoutingCapability } from "../services/CrmRoutingService/routingReadModels.js";

export async function resolveOutboundConnection(
  context: ServiceContext,
  conversationCycle: CrmConversationCycle,
  ports: CrmServicePorts,
  requiredCapabilities: readonly CrmRoutingCapability[] = ["outbound"],
) {
  const channel = providerChannel(conversationCycle.channel);
  const connection = await resolveCrmProviderOperation({
    channel,
    connectionId: conversationCycle.connectionId,
    ports,
    requiredCapabilities,
    scope: {
      storeId: conversationCycle.storeId,
      tenantId: conversationCycle.tenantId,
    },
  });
  assertProviderEffectAllowed(context, connection, {
    olxChatEnabled: isCrmOlxChatEnabled(ports),
  });
  await assertOfficialMessagingWindow(
    connection,
    conversationCycle,
    getCrmConversationRepository(ports),
  );
  return connection;
}

function providerChannel(channel: CrmConversationCycle["channel"]) {
  if (channel === "WHATSAPP") return "whatsapp" as const;
  if (channel === "INSTAGRAM") return "instagram" as const;
  if (channel === "OLX_CHAT") return "olx_chat" as const;
  throw new CrmConnectionNotFoundError("web_chat");
}
