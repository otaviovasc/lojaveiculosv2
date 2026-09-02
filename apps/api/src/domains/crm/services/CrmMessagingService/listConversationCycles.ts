import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmHumanAttendanceState,
  CrmConversationCycleStatus,
} from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import { auditCrmServiceEvent, logCrmServiceEvent } from "./serviceSupport.js";
import { resolveCrmConnectionScopedQueueVisibility } from "../../messaging/crmQueueVisibility.js";

const permission = "crm.conversations.read";

export type ListConversationCyclesInput = {
  assigneeId?: string;
  connectionId?: string;
  filter?: "all" | "fresh" | "mine" | "others" | "unassigned";
  humanAttendanceState?: CrmHumanAttendanceState;
  leadId?: string;
  limit: number;
  offset: number;
  search?: string;
  cycleId?: string;
  status?: CrmConversationCycleStatus;
  tagIds?: string[];
  unreadOnly?: boolean;
};

export async function listConversationCycles(
  context: ServiceContext,
  input: ListConversationCyclesInput,
  ports: CrmServicePorts,
): Promise<readonly CrmConversationCycle[]> {
  assertPermission(context, permission);
  const scope = requireCrmMessagingScope(context);
  const whatsappRepository = getCrmConversationRepository(ports);
  logCrmServiceEvent(context, "crm.conversation_cycles.list.started", {
    assigneeId: input.assigneeId ?? null,
    filter: input.filter ?? null,
    humanAttendanceState: input.humanAttendanceState ?? null,
    leadId: input.leadId ?? null,
    search: input.search ?? null,
    status: input.status ?? null,
  });
  const { assigneeId, ...query } = input;
  const result = await whatsappRepository.listConversationCycles({
    ...query,
    ...(assigneeId ? { selectedAssigneeId: assigneeId as never } : {}),
    ...(context.actor.kind === "user"
      ? { assignedUserId: context.actor.id as never }
      : {}),
    queueVisibility: await resolveCrmConnectionScopedQueueVisibility(
      context,
      ports,
    ),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.conversation_cycles.list",
    category: "data_access",
    metadata: {
      filter: input.filter ?? "all",
      assigneeId: input.assigneeId ?? null,
      leadId: input.leadId ?? null,
      cycleCount: result.length,
    },
    permission,
    summary: "Listed CRM conversation cycles",
  });
  return result;
}
