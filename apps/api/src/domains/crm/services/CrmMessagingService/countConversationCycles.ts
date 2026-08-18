import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CountCrmConversationCyclesInput,
  CrmConversationCycleStatus,
} from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { auditCrmServiceEvent, logCrmServiceEvent } from "./serviceSupport.js";
import { resolveCrmQueueVisibility } from "../../messaging/crmQueueVisibility.js";

const permission = "crm.conversations.read";

export const conversationCycleCountFilters = [
  "all",
  "fresh",
  "mine",
  "others",
  "unassigned",
] as const;

const conversationCycleCountStatuses = [
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "HUMAN_TAKEOVER",
  "MINIBOT_ACTIVE",
] as const satisfies readonly CrmConversationCycleStatus[];

export type CountConversationCyclesInput = Omit<
  CountCrmConversationCyclesInput,
  | "assignedUserId"
  | "queueVisibility"
  | "selectedAssigneeId"
  | "storeId"
  | "tenantId"
>;

export type ConversationCycleCounts = {
  assignees: ReadonlyArray<{ assigneeId: string; count: number }>;
  filters: Record<(typeof conversationCycleCountFilters)[number], number>;
  inHumanService: number;
  statuses: Record<CrmConversationCycleStatus, number>;
  total: number;
  unread: number;
  waitingHuman: number;
};

export async function countConversationCycles(
  context: ServiceContext,
  input: CountConversationCyclesInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCounts> {
  assertPermission(context, permission);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
  logCrmServiceEvent(context, "crm.conversation_cycles.count.started", {
    filter: input.filter ?? null,
    search: input.search ?? null,
    status: input.status ?? null,
    humanAttendanceState: input.humanAttendanceState ?? null,
    unreadOnly: input.unreadOnly ?? false,
  });
  const base = {
    ...input,
    ...(context.actor.kind === "user"
      ? { assignedUserId: context.actor.id as never }
      : {}),
    queueVisibility: resolveCrmQueueVisibility(context),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const count = (override: Partial<CountCrmConversationCyclesInput> = {}) =>
    repository.countConversationCycles({ ...base, ...override });
  const filterCounts = await Promise.all(
    conversationCycleCountFilters.map(async (filter) => [
      filter,
      await count({ filter }),
    ]),
  );
  const statusCounts = await Promise.all(
    conversationCycleCountStatuses.map(async (status) => [
      status,
      await count({ status }),
    ]),
  );

  const result = {
    assignees: await repository.countConversationCyclesByAssignee({
      ...base,
      filter: "all",
    }),
    filters: Object.fromEntries(
      filterCounts,
    ) as ConversationCycleCounts["filters"],
    inHumanService: await count({
      humanAttendanceState: "IN_HUMAN_SERVICE",
    }),
    statuses: Object.fromEntries(
      statusCounts,
    ) as ConversationCycleCounts["statuses"],
    total: await count(),
    unread: await count({ unreadOnly: true }),
    waitingHuman: await count({ humanAttendanceState: "WAITING_HUMAN" }),
  };
  await auditCrmServiceEvent(context, {
    action: "crm.conversation_cycles.count",
    category: "data_access",
    metadata: {
      filter: input.filter ?? "all",
      status: input.status ?? null,
      assignees: result.assignees.length,
      total: result.total,
      unread: result.unread,
      waitingHuman: result.waitingHuman,
      inHumanService: result.inHumanService,
    },
    permission,
    summary: "Counted CRM WhatsApp conversationCycles",
  });
  return result;
}
