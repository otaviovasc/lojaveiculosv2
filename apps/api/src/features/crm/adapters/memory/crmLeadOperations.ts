import type {
  CrmLead,
  CrmLeadActivity,
} from "../../../../domains/crm/ports/crmRepository.js";

export function projectMemoryLeadOperations(
  leads: CrmLead[],
  activities: CrmLeadActivity[],
): CrmLead[] {
  return leads.map((lead) => {
    const scoped = activities.filter(
      (a) =>
        a.leadId === lead.id &&
        a.storeId === lead.storeId &&
        a.tenantId === lead.tenantId,
    );
    const communication = scoped.filter(
      (a) =>
        ["call", "message", "email"].includes(a.activityType) &&
        a.direction !== "internal",
    );
    const tasks = scoped
      .filter(
        (a) =>
          a.activityType === "task" &&
          a.metadata.completed !== true &&
          !a.metadata.completedAt &&
          !["completed", "cancelled", "done"].includes(
            String(a.metadata.status),
          ),
      )
      .map((a) => ({
        id: a.id,
        title: String(a.metadata.title || a.content),
        dueAt: taskInstant(a.metadata.dueAt),
      }))
      .filter(
        (a): a is { id: string; title: string; dueAt: string } =>
          a.dueAt !== null,
      )
      .sort(
        (a, b) =>
          Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.id.localeCompare(b.id),
      );
    return {
      ...lead,
      responseState: communication.some((a) => a.direction === "outbound")
        ? "responded"
        : "no_response",
      lastInteractionAt: communication.length
        ? new Date(
            Math.max(...communication.map((a) => a.occurredAt.getTime())),
          )
        : null,
      nextTask: tasks[0] ?? null,
      humanAttendanceState: lead.humanAttendanceState ?? null,
    };
  });
}
function taskInstant(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(
    /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}-03:00`,
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
