import { AuthorizationError } from "../../shared/authorization.js";
import type { ServiceContext } from "../../shared/serviceContext.js";
import type {
  CrmLead,
  CrmLeadCursor,
  CrmLeadOperationalFilters,
} from "./ports/crmRepository.js";

export function leadOperationalFilters(input: {
  [K in keyof CrmLeadOperationalFilters]?:
    CrmLeadOperationalFilters[K] | undefined;
}): CrmLeadOperationalFilters {
  return {
    ...(input.assignee ? { assignee: input.assignee } : {}),
    ...(input.sources ? { sources: input.sources } : {}),
    ...(input.listingId ? { listingId: input.listingId } : {}),
    ...(input.responseState ? { responseState: input.responseState } : {}),
    ...(input.inactiveDays ? { inactiveDays: input.inactiveDays } : {}),
    ...(input.humanAttendanceState
      ? { humanAttendanceState: input.humanAttendanceState }
      : {}),
    ...(input.sortBy ? { sortBy: input.sortBy } : {}),
  };
}

export function leadPageCursor(
  lead: CrmLead,
  sortBy?: CrmLeadOperationalFilters["sortBy"],
): CrmLeadCursor {
  return {
    id: lead.id,
    updatedAt: lead.updatedAt,
    ...(sortBy
      ? {
          sortBy,
          sortAt:
            sortBy === "next_task"
              ? lead.nextTask
                ? new Date(lead.nextTask.dueAt)
                : null
              : lead.createdAt,
        }
      : {}),
  };
}

export function resolvedLeadFilters(
  context: ServiceContext,
  input: CrmLeadOperationalFilters,
): CrmLeadOperationalFilters {
  const filters = leadOperationalFilters(input);
  if (filters.assignee !== "me") return filters;
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "My leads requires an authenticated store user.",
    );
  }
  return { ...filters, assignee: context.actor.id };
}
