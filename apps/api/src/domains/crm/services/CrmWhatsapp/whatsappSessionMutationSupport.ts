import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";
import { toWhatsappSession } from "../../whatsapp/whatsappModels.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappSessionNotFoundError,
} from "../../whatsapp/whatsappSendErrors.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { resolveWhatsappQueueVisibility } from "../../whatsapp/whatsappQueueVisibility.js";

export async function resolveScopedWhatsappSession(
  context: ServiceContext,
  input: { sessionId: string },
  ports: CrmServicePorts,
) {
  const scope = requireCrmWhatsappScope(context);
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    queueVisibility: resolveWhatsappQueueVisibility(context),
    sessionId: input.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return { scope, session: session ?? null };
}

export async function findScopedWhatsappSession(
  context: ServiceContext,
  input: { sessionId: string },
  ports: CrmServicePorts,
) {
  const { scope, session } = await resolveScopedWhatsappSession(
    context,
    input,
    ports,
  );
  if (!session) throw new WhatsappSessionNotFoundError(input.sessionId);
  return { scope, session };
}

export async function findOutboundWhatsappSession(
  context: ServiceContext,
  input: { sessionId: string },
  ports: CrmServicePorts,
) {
  const scope = requireCrmWhatsappScope(context);
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId: input.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) throw new WhatsappSessionNotFoundError(input.sessionId);

  if (context.permissions.includes("crm.whatsapp.assign")) {
    return { requiresAssignment: false, scope, session };
  }
  if (context.actor.kind === "system" || context.actor.kind === "integration") {
    return { requiresAssignment: false, scope, session };
  }
  if (context.actor.kind !== "user") {
    throw new WhatsappSessionNotFoundError(input.sessionId);
  }
  if (
    session.assignedUserId !== null &&
    session.assignedUserId !== context.actor.id
  ) {
    throw new WhatsappSessionNotFoundError(input.sessionId);
  }
  return {
    requiresAssignment: session.assignedUserId === null,
    scope,
    session,
  };
}

export async function sessionWithConnection(
  session: CrmWhatsappSession | null,
  ports: CrmServicePorts,
  sessionId: string,
): Promise<WhatsappSession> {
  if (!session) throw new WhatsappSessionNotFoundError(sessionId);
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    session.connectionId,
  );
  if (
    !connection ||
    connection.storeId !== session.storeId ||
    connection.tenantId !== session.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(session.connectionId);
  }
  return toWhatsappSession(session, connection);
}
