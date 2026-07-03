import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CountCrmWhatsappSessionsInput,
  CrmWhatsappSessionStatus,
} from "../../ports/crmWhatsappRepository.js";
import {
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.list";

export const whatsappSessionCountFilters = [
  "all",
  "fresh",
  "mine",
  "others",
  "unassigned",
] as const;

const whatsappSessionCountStatuses = [
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "HUMAN_TAKEOVER",
  "MINIBOT_ACTIVE",
] as const satisfies readonly CrmWhatsappSessionStatus[];

export type CountWhatsappSessionsInput = Omit<
  CountCrmWhatsappSessionsInput,
  "assignedUserId" | "storeId" | "tenantId"
>;

export type WhatsappSessionCounts = {
  filters: Record<(typeof whatsappSessionCountFilters)[number], number>;
  statuses: Record<CrmWhatsappSessionStatus, number>;
  total: number;
  unread: number;
};

export async function countWhatsappSessions(
  context: ServiceContext,
  input: CountWhatsappSessionsInput,
  ports: CrmServicePorts,
): Promise<WhatsappSessionCounts> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const repository = getCrmWhatsappRepository(ports);
  logWhatsappServiceEvent(context, "crm.whatsapp.sessions.count.started", {
    filter: input.filter ?? null,
    search: input.search ?? null,
    status: input.status ?? null,
    unreadOnly: input.unreadOnly ?? false,
  });
  const base = {
    ...input,
    ...(context.actor.kind === "user"
      ? { assignedUserId: context.actor.id as never }
      : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const count = (override: Partial<CountCrmWhatsappSessionsInput> = {}) =>
    repository.countSessions({ ...base, ...override });
  const filterCounts = await Promise.all(
    whatsappSessionCountFilters.map(async (filter) => [
      filter,
      await count({ filter }),
    ]),
  );
  const statusCounts = await Promise.all(
    whatsappSessionCountStatuses.map(async (status) => [
      status,
      await count({ status }),
    ]),
  );

  const result = {
    filters: Object.fromEntries(
      filterCounts,
    ) as WhatsappSessionCounts["filters"],
    statuses: Object.fromEntries(
      statusCounts,
    ) as WhatsappSessionCounts["statuses"],
    total: await count(),
    unread: await count({ unreadOnly: true }),
  };
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.sessions.count",
    category: "data_access",
    metadata: {
      filter: input.filter ?? "all",
      status: input.status ?? null,
      total: result.total,
      unread: result.unread,
    },
    permission,
    summary: "Counted CRM WhatsApp sessions",
  });
  return result;
}
