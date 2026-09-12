import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertOfficialMessagingWindow } from "./assertOfficialMessagingWindow.js";
import type { CrmConversationCycle } from "../ports/crmConversationRepository.js";
import {
  getCrmConnectionRepository,
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

/**
 * Resolves the connection needed to materialize a provider-confirmed intent.
 * This path deliberately checks only durable tenant/store/connection
 * identity. A replay must remain possible after the connection is paused or
 * the official messaging window has closed, and it must never invoke the
 * provider again merely because current readiness changed.
 */
export async function resolveOutboundConnectionForReplay(
  context: ServiceContext,
  conversationCycle: CrmConversationCycle,
  ports: CrmServicePorts,
) {
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    conversationCycle.connectionId,
  );
  if (
    !connection ||
    connection.storeId !== conversationCycle.storeId ||
    connection.tenantId !== conversationCycle.tenantId ||
    connection.storeId !== context.storeId ||
    connection.tenantId !== context.tenantId ||
    connection.channel !== providerChannel(conversationCycle.channel)
  ) {
    throw new CrmConnectionNotFoundError(conversationCycle.connectionId);
  }
  return connection;
}

export async function resolveOutboundConnectionForDelivery(input: {
  claimKind: "claimed" | "provider_succeeded";
  context: ServiceContext;
  conversationCycle: CrmConversationCycle;
  ports: CrmServicePorts;
  preflightConnection: Awaited<
    ReturnType<typeof resolveOutboundConnection>
  > | null;
  requiredCapabilities: readonly CrmRoutingCapability[];
}) {
  if (input.claimKind === "provider_succeeded") {
    return resolveOutboundConnectionForReplay(
      input.context,
      input.conversationCycle,
      input.ports,
    );
  }
  return (
    input.preflightConnection ??
    resolveOutboundConnection(
      input.context,
      input.conversationCycle,
      input.ports,
      input.requiredCapabilities,
    )
  );
}

export function createOutboundConnectionResolver(
  context: ServiceContext,
  ports: CrmServicePorts,
  requiredCapabilities: readonly CrmRoutingCapability[] = ["outbound"],
) {
  let preflightConnection: Awaited<
    ReturnType<typeof resolveOutboundConnection>
  > | null = null;
  return {
    beforeAssignment: async (conversationCycle: CrmConversationCycle) => {
      preflightConnection = await resolveOutboundConnection(
        context,
        conversationCycle,
        ports,
        requiredCapabilities,
      );
    },
    resolve: (
      claimKind: "claimed" | "provider_succeeded",
      conversationCycle: CrmConversationCycle,
    ) =>
      resolveOutboundConnectionForDelivery({
        claimKind,
        context,
        conversationCycle,
        ports,
        preflightConnection,
        requiredCapabilities,
      }),
  };
}

function providerChannel(channel: CrmConversationCycle["channel"]) {
  if (channel === "WHATSAPP") return "whatsapp" as const;
  if (channel === "INSTAGRAM") return "instagram" as const;
  if (channel === "OLX_CHAT") return "olx_chat" as const;
  throw new CrmConnectionNotFoundError("web_chat");
}
