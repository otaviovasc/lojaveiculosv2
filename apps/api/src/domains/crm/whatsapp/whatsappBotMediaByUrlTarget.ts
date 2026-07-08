import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepository.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { WhatsappBotActionError } from "../services/CrmWhatsapp/whatsappBotIntegration.js";
import { normalizeWhatsappPhone } from "./startWhatsappConversationSupport.js";
import type {
  BotMediaTarget,
  SendWhatsappBotMediaByUrlInput,
} from "./whatsappBotMediaByUrlTypes.js";

export async function resolveBotMediaTarget(
  context: ServiceContext,
  input: SendWhatsappBotMediaByUrlInput,
  ports: CrmServicePorts,
): Promise<BotMediaTarget> {
  const scope = requireCrmScope(context);
  const repository = getCrmWhatsappRepository(ports);
  if (input.sessionId) {
    const [session] = await repository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: input.sessionId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!session) return missingTarget("Session was not found.");
    return {
      ...(session.buyerName ? { buyerName: session.buyerName } : {}),
      connection: await requireBotConnection(
        context,
        session.connectionId,
        ports,
      ),
      phone: session.buyerPhone,
      session,
    };
  }

  if (!input.connectionId || !input.phone) {
    return missingTarget(
      "sessionId or connectionId plus payload.phone is required.",
    );
  }
  const phone = normalizeWhatsappPhone(input.phone);
  const connection = await requireBotConnection(
    context,
    input.connectionId,
    ports,
  );
  const [existing] = await repository.listSessions({
    connectionId: connection.id,
    limit: 20,
    offset: 0,
    search: phone,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return {
    ...(input.buyerName ? { buyerName: input.buyerName } : {}),
    connection,
    phone,
    session: existing?.buyerPhone === phone ? existing : null,
  };
}

export function assertBotMediaTargetIsAvailable(
  session: CrmWhatsappSession | null,
) {
  if (session?.status === "HUMAN_TAKEOVER") {
    throw new WhatsappBotActionError(
      "Bot sends are blocked while human takeover is active.",
      "CRM_WHATSAPP_BOT_ACTION_BLOCKED",
      409,
    );
  }
}

async function requireBotConnection(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (
    !connection ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    return missingTarget("Connection was not found.");
  }
  return connection;
}

function missingTarget(message: string): never {
  throw new WhatsappBotActionError(
    message,
    "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
    404,
  );
}
