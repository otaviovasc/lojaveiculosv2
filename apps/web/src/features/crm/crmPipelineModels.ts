import type {
  CreateProductCrmActivityInput,
  CreateProductCrmLeadInput,
  CrmLeadHumanAttendanceState,
  CrmLeadResponseState,
  CrmLeadSource,
  CrmLeadStatus,
  LeadActivityType,
  ProductCrmLead,
  ProductCrmLeadActivity,
  UpdateProductCrmLeadInput,
} from "./productCrmTypes";

export type CrmViewMode = "kanban" | "list" | "table";

export type CrmLeadSortBy = "created_at" | "next_task";

export const CRM_LEAD_DEFAULT_SORT: CrmLeadSortBy = "created_at";

export type LeadFilters = {
  assignee?: string | undefined;
  humanAttendanceState?: CrmLeadHumanAttendanceState | "all";
  inactiveDays?: number | null;
  listingId?: string | undefined;
  responseState?: CrmLeadResponseState | "all";
  search: string;
  sortBy?: CrmLeadSortBy;
  source: CrmLeadSource | "all";
  sources?: CrmLeadSource[] | undefined;
  status: CrmLeadStatus | "all";
};

export function createDefaultLeadFilters(): LeadFilters {
  return {
    assignee: undefined,
    humanAttendanceState: "all",
    inactiveDays: null,
    listingId: undefined,
    responseState: "all",
    search: "",
    sortBy: CRM_LEAD_DEFAULT_SORT,
    source: "all",
    sources: [],
    status: "all",
  };
}

export function hasActiveServerLeadFilters(filters: LeadFilters) {
  return Boolean(
    (filters.responseState && filters.responseState !== "all") ||
    (typeof filters.inactiveDays === "number" &&
      Number.isInteger(filters.inactiveDays) &&
      filters.inactiveDays > 0) ||
    (filters.humanAttendanceState && filters.humanAttendanceState !== "all") ||
    (filters.sortBy && filters.sortBy !== CRM_LEAD_DEFAULT_SORT) ||
    (filters.assignee &&
      filters.assignee !== "all" &&
      filters.assignee !== "") ||
    (filters.sources && filters.sources.length > 0) ||
    Boolean(filters.listingId),
  );
}

export type LeadCreateDraft = CreateProductCrmLeadInput & {
  initialNote?: string;
  initialPipelineStageId?: string;
  taskDueAt?: string | null;
  taskTitle?: string | null;
};

export type LeadContactPatch = Pick<
  UpdateProductCrmLeadInput,
  "birthDate" | "buyerEmail" | "buyerName" | "buyerPhone" | "metadata"
>;

export type LeadTaskMetadata = {
  dueAt?: string | undefined;
  title?: string | undefined;
};

export function filterLeads(leads: ProductCrmLead[], filters: LeadFilters) {
  const needle = normalize(filters.search);

  return leads.filter((lead) => {
    const matchesStatus =
      filters.status === "all" || lead.status === filters.status;
    const matchesSource =
      filters.source === "all" || lead.source === filters.source;
    const matchesSearch =
      !needle ||
      [
        lead.buyerName,
        lead.buyerEmail,
        lead.buyerPhone,
        lead.vehicleTitle,
        lead.source,
        lead.status,
      ].some((value) => normalize(value).includes(needle));

    return matchesStatus && matchesSource && matchesSearch;
  });
}

export function deriveLeadStats(
  leads: ProductCrmLead[],
  activities: ProductCrmLeadActivity[],
) {
  const open = leads.filter(
    (lead) => !["won", "lost", "archived"].includes(lead.status),
  ).length;
  const won = leads.filter((lead) => lead.status === "won").length;
  const taskCount = activities.filter(isTaskActivity).length;
  const overdueTasks = activities.filter(isOverdueTask).length;

  return { open, overdueTasks, taskCount, total: leads.length, won };
}

export function createTaskActivityInput(
  title: string,
  dueAt: string,
): CreateProductCrmActivityInput {
  return {
    activityType: "task",
    content: `Tarefa: ${title}`,
    direction: "internal",
    metadata: { dueAt, title },
    occurredAt: new Date().toISOString(),
    priority: isPastDate(dueAt) ? 2 : 1,
  };
}

export function createNoteActivityInput(
  content: string,
  activityType: LeadActivityType = "note",
): CreateProductCrmActivityInput {
  return {
    activityType,
    content,
    direction: activityType === "note" ? "internal" : "outbound",
  };
}

export function readTaskMetadata(
  activity: ProductCrmLeadActivity,
): LeadTaskMetadata {
  return {
    dueAt: readString(activity.metadata.dueAt),
    title: readString(activity.metadata.title),
  };
}

export function isTaskActivity(activity: ProductCrmLeadActivity) {
  return activity.activityType === "task";
}

export function isOverdueTask(activity: ProductCrmLeadActivity) {
  if (!isTaskActivity(activity)) return false;
  const dueAt = readTaskMetadata(activity).dueAt;
  return Boolean(dueAt && isPastDate(dueAt));
}

export function formatLeadName(lead: ProductCrmLead) {
  return lead.buyerName?.trim() || "Lead sem nome";
}

export function formatRelativeDate(value: string | null) {
  if (!value) return "Sem interação";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes || 1} min atrás`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h atrás`;
  return `${Math.floor(diffHours / 24)} d atrás`;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isPastDate(value: string) {
  return new Date(value).getTime() < Date.now();
}
