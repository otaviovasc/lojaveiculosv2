import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { CrmRoutingPolicyValidationError } from "../services/CrmRoutingService/routingErrors.js";
import { resolveCrmRoutingPolicy } from "../services/CrmRoutingService/resolveCrmRoutingPolicy.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";

export async function assertSchedulingRoute(
  connectionId: string,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  const routing = await resolveCrmRoutingPolicy(scope, ports, [
    "scheduling",
    "outbound",
  ]);
  const route = routing.channels.find(
    (channel) => channel.channel === "whatsapp",
  )?.storeDefault;
  if (!route?.ready || !route.connection) {
    throw new CrmRoutingPolicyValidationError(
      route?.blocked?.message ??
        "The configured scheduled-message route is unavailable.",
      route?.blocked?.code ?? "policy_not_configured",
    );
  }
  if (route.connection.id !== connectionId) {
    throw new WhatsappMessageActionError(
      "The conversation connection does not match the configured scheduled-message route.",
      409,
    );
  }
}
