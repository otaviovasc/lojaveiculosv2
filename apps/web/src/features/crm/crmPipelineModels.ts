import { normalizeBrazilianPhoneDigits } from "../../lib/masks";
import { pipelineStatuses } from "./crmPipelineConfig";
import type {
  CreateProductCrmActivityInput,
  CreateProductCrmLeadInput,
  CrmLeadSource,
  CrmLeadStatus,
  LeadActivityType,
  ProductCrmLead,
  ProductCrmLeadActivity,
  UpdateProductCrmLeadInput,
} from "./productCrmTypes";

export type CrmViewMode = "kanban" | "list" | "table";

export type LeadFilters = {
  search: string;
  source: CrmLeadSource | "all";
  status: CrmLeadStatus | "all";
};

export type LeadCreateDraft = CreateProductCrmLeadInput & {
  initialNote?: string;
  initialPipelineStageId?: string;
  taskDueAt?: string | null;
  taskTitle?: string | null;
};

export type LeadContactPatch = Pick<
  UpdateProductCrmLeadInput,
  "buyerEmail" | "buyerName" | "buyerPhone" | "metadata"
>;

export type LeadTaskMetadata = {
  dueAt?: string | undefined;
  title?: string | undefined;
};

export function buildLeadContactPatch(
  lead: Pick<ProductCrmLead, "buyerPhone">,
  draft: LeadContactPatch,
): LeadContactPatch {
  const { buyerPhone, ...patch } = draft;
  if (!("buyerPhone" in draft)) return patch;

  const currentPhone = normalizeBrazilianPhoneDigits(lead.buyerPhone ?? "");
  const nextPhone = normalizeBrazilianPhoneDigits(buyerPhone ?? "");
  return currentPhone === nextPhone
    ? patch
    : { ...patch, buyerPhone: nextPhone || null };
}

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

export function groupLeadsByStatus(leads: ProductCrmLead[]) {
  return Object.fromEntries(
    pipelineStatuses.map((status) => [
      status,
      leads.filter((lead) => lead.status === status),
    ]),
  ) as Record<(typeof pipelineStatuses)[number], ProductCrmLead[]>;
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

export function formatLeadContact(lead: ProductCrmLead) {
  return lead.buyerPhone || lead.buyerEmail || "Contato nao informado";
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
