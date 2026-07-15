import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappSessionStatus } from "../../ports/crmWhatsappRepository.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";
import { toWhatsappSession } from "../../whatsapp/whatsappModels.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.list";

export type ListWhatsappSessionsInput = {
  assigneeId?: string;
  connectionId?: string;
  filter?: "all" | "fresh" | "mine" | "others" | "unassigned";
  leadId?: string;
  limit: number;
  offset: number;
  search?: string;
  sessionId?: string;
  status?: CrmWhatsappSessionStatus;
  tagIds?: string[];
  unreadOnly?: boolean;
};

export async function listWhatsappSessions(
  context: ServiceContext,
  input: ListWhatsappSessionsInput,
  ports: CrmServicePorts,
): Promise<readonly WhatsappSession[]> {
  assertPermission(context, permission);
  const scope = requireCrmWhatsappScope(context);
  const whatsappRepository = getCrmWhatsappRepository(ports);
  const connectionRepository = getCrmConnectionRepository(ports);
  logWhatsappServiceEvent(context, "crm.whatsapp.sessions.list.started", {
    assigneeId: input.assigneeId ?? null,
    filter: input.filter ?? null,
    leadId: input.leadId ?? null,
    search: input.search ?? null,
    status: input.status ?? null,
  });
  const { assigneeId, ...query } = input;
  const [sessions, connections] = await Promise.all([
    whatsappRepository.listSessions({
      ...query,
      ...(assigneeId ? { selectedAssigneeId: assigneeId as never } : {}),
      ...(context.actor.kind === "user"
        ? { assignedUserId: context.actor.id as never }
        : {}),
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    }),
    connectionRepository.listConnections({
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    }),
  ]);
  const connectionById = new Map(
    connections.map((connection) => [connection.id, connection]),
  );
  const result = sessions.flatMap((session) => {
    const connection = connectionById.get(session.connectionId);
    return connection ? [toWhatsappSession(session, connection)] : [];
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.sessions.list",
    category: "data_access",
    metadata: {
      filter: input.filter ?? "all",
      assigneeId: input.assigneeId ?? null,
      leadId: input.leadId ?? null,
      sessionCount: result.length,
    },
    permission,
    summary: "Listed CRM WhatsApp sessions",
  });
  return result;
}
