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
