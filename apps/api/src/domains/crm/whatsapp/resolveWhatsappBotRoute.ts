import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmConnection,
  CrmConnectionProvider,
} from "../ports/crmConnectionRepository.js";
import type {
  CrmRoutingConnection,
  CrmRoutingConnectionRepository,
} from "../ports/crmRoutingConnectionRepository.js";
import type {
  CrmRoutingChannel,
  CrmRoutingPolicyRepository,
} from "../ports/crmRoutingPolicyRepository.js";
import type { CrmRoutingCapability } from "../services/CrmRoutingService/routingReadModels.js";
import { resolveCrmConnectionRoute } from "../services/CrmRoutingService/routingResolution.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { requireCrmScope } from "../services/CrmService/serviceSupport.js";
import { WhatsappBotActionError } from "../services/CrmWhatsapp/whatsappBotIntegration.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";

type RoutingAwareCrmServicePorts = CrmServicePorts & {
  crmRoutingConnectionRepository?: CrmRoutingConnectionRepository;
  crmRoutingPolicyRepository?: CrmRoutingPolicyRepository;
};

export async function resolveWhatsappBotRoute(
  context: ServiceContext,
  input: {
    channel: CrmRoutingChannel;
    requestedConnectionId?: string;
    requiredCapabilities: readonly CrmRoutingCapability[];
  },
  ports: CrmServicePorts,
): Promise<CrmConnection> {
  const scope = requireCrmScope(context);
  const routingPorts = ports as RoutingAwareCrmServicePorts;
  if (
    !routingPorts.crmRoutingPolicyRepository ||
    !routingPorts.crmRoutingConnectionRepository
  ) {
    return unavailable(
      "CRM bot routing is unavailable. Configure the CRM routing runtime.",
    );
  }
  const [policies, canonicalConnections] = await Promise.all([
    routingPorts.crmRoutingPolicyRepository.listPolicies(scope as never),
    routingPorts.crmRoutingConnectionRepository.listConnections(scope as never),
  ]);
  const policy = policies.find((item) => item.channel === input.channel);
  if (!policy || policy.botMode === "disabled") {
    return unavailable(
      `Bot routing is disabled for ${input.channel}. Enable inherited or explicit bot routing.`,
    );
  }
  const connectionId =
    policy.botMode === "inherit_store_default"
      ? policy.defaultConnectionId
      : policy.botConnectionId;
  if (
    input.requestedConnectionId &&
    input.requestedConnectionId !== connectionId
  ) {
    throw new WhatsappBotActionError(
      "The requested connection does not match the configured bot route for this channel.",
      "CRM_WHATSAPP_BOT_ROUTE_MISMATCH",
      409,
    );
  }
  const canonicalConnection = connectionId
    ? (canonicalConnections.find((item) => item.id === connectionId) ?? null)
    : null;
  const resolved = resolveCrmConnectionRoute({
    channel: input.channel,
    connection: canonicalConnection,
    connectionId,
    requiredCapabilities: input.requiredCapabilities,
    scope,
  });
  if (!resolved.ready || !canonicalConnection) {
    const reason = resolved.blocked;
    return unavailable(
      reason
        ? `${reason.message} ${reason.remediation}`
        : "The configured bot route is not ready.",
    );
  }
  const transportConnection =
    await ports.crmConnectionRepository?.findConnectionById(
      canonicalConnection.id,
    );
  if (!transportConnection) {
    return unavailable(
      "The configured bot route has no provider transport credentials. Reconnect the channel connection.",
    );
  }
  return withCanonicalRoutingIdentity(canonicalConnection, transportConnection);
}

export async function assertWhatsappBotSessionRoute(
  context: ServiceContext,
  session: CrmWhatsappSession,
  ports: CrmServicePorts,
) {
  await resolveWhatsappBotRoute(
    context,
    {
      channel: routingChannelForSession(session),
      requestedConnectionId: session.connectionId,
      requiredCapabilities: ["outbound"],
    },
    ports,
  );
}

function routingChannelForSession(
  session: CrmWhatsappSession,
): CrmRoutingChannel {
  if (session.channel === "INSTAGRAM") return "instagram";
  if (session.channel === "OLX_CHAT") return "olx_chat";
  return "whatsapp";
}

function withCanonicalRoutingIdentity(
  canonical: CrmRoutingConnection,
  transport: CrmConnection,
): CrmConnection {
  return {
    ...transport,
    displayName: canonical.displayName,
    id: canonical.id,
    provider: canonicalTransportProvider(canonical),
    status: canonical.state,
    storeId: canonical.storeId,
    tenantId: canonical.tenantId,
  };
}

function canonicalTransportProvider(
  connection: CrmRoutingConnection,
): CrmConnectionProvider {
  if (connection.provider === "zapi") return "zapi";
  if (connection.provider === "olx") return "olx_chat";
  return connection.channel === "instagram"
    ? "composio_instagram"
    : "composio_whatsapp";
}

function unavailable(message: string): never {
  throw new WhatsappBotActionError(
    message,
    "CRM_WHATSAPP_BOT_ROUTE_UNAVAILABLE",
    409,
  );
}
