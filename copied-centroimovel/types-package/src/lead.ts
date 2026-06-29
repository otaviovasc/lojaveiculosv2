import { z } from "zod";

export const LeadSourceSchema = z.enum([
  "CENTRO_IMOVEL_FORM",
  "WORKSPACE_STOREFRONT",
  "PORTAL_LISTING",
  "CAPTACAO_STOREFRONT",
  "INSTAGRAM",
  "FACEBOOK",
  "OLX",
  "ZAP_IMOVEIS",
  "WHATSAPP",
  "MANUAL",
  "EXTERNAL_API",
  "OWNER_REFERRAL",
  "GOOGLE_ADS",
  "META_ADS",
  "DIRECT_TRAFFIC",
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const LeadTagSchema = z.enum([
  "QUENTE",
  "MORNO",
  "FRIO",
  "POS_VENDA",
  "POS_LOCACAO",
]);
export type LeadTag = z.infer<typeof LeadTagSchema>;

export const AttributionModelSchema = z.enum([
  "FIRST_TOUCH",
  "LAST_TOUCH",
  "LINEAR",
  "TIME_DECAY",
  "POSITION_BASED",
]);
export type AttributionModel = z.infer<typeof AttributionModelSchema>;

export const LeadCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  propertyId: z.string().optional().nullable(),
  source: LeadSourceSchema.default("CENTRO_IMOVEL_FORM"),
  sourceName: z.string().optional().nullable(),
  tag: LeadTagSchema.optional().nullable(),
  columnId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  read: z.boolean().optional().nullable(),

  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  sessionUtmSource: z.string().optional().nullable(),
  sessionUtmMedium: z.string().optional().nullable(),
  sessionUtmCampaign: z.string().optional().nullable(),
  sessionUtmTerm: z.string().optional().nullable(),
  sessionUtmContent: z.string().optional().nullable(),
  fbclid: z.string().optional().nullable(),
  gclid: z.string().optional().nullable(),
  visitorId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  attributionModel: AttributionModelSchema.optional().nullable(),
});
export type LeadCreate = z.infer<typeof LeadCreateSchema>;

export const LeadUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  tag: LeadTagSchema.optional().nullable(),
  columnId: z.string().optional().nullable(),
  read: z.boolean().optional(),
  assignedToId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
});
export type LeadUpdate = z.infer<typeof LeadUpdateSchema>;

export const LeadListFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  tag: LeadTagSchema.optional(),
  source: LeadSourceSchema.optional(),
  columnId: z.string().optional(),
  read: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type LeadListFilter = z.infer<typeof LeadListFilterSchema>;

export const LeadQuickUpdateSchema = z
  .object({
    id: z.string(),
    name: z.string().min(2).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    tag: LeadTagSchema.optional().nullable(),
    columnId: z.string().optional().nullable(),
    read: z.boolean().optional(),
    assignedToId: z.string().optional().nullable(),
    propertyId: z.string().optional().nullable(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.phone !== undefined ||
      value.tag !== undefined ||
      value.columnId !== undefined ||
      value.read !== undefined ||
      value.assignedToId !== undefined ||
      value.propertyId !== undefined,
    {
      message: "Nenhum campo para atualização foi informado",
      path: ["id"],
    },
  );
export type LeadQuickUpdate = z.infer<typeof LeadQuickUpdateSchema>;

export const LeadDeleteSchema = z.object({
  id: z.string(),
});
export type LeadDelete = z.infer<typeof LeadDeleteSchema>;

export const LeadColumnCreateSchema = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#6366f1"),
  position: z.number().int().min(0),
});
export type LeadColumnCreate = z.infer<typeof LeadColumnCreateSchema>;

export const LeadColumnUpdateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  position: z.number().int().min(0).optional(),
});
export type LeadColumnUpdate = z.infer<typeof LeadColumnUpdateSchema>;

export const LeadInteractionCreateSchema = z.object({
  note: z.string().min(1),
  channel: z.string().optional().nullable(),
});
export type LeadInteractionCreate = z.infer<typeof LeadInteractionCreateSchema>;

export const LeadTaskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime(),
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  cadenceCycleId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
});
export type LeadTaskCreate = z.infer<typeof LeadTaskCreateSchema>;

export const LeadQualificationCreateSchema = z.object({
  leadId: z.string(),
  budgetMin: z.number().int().optional().nullable(),
  budgetMax: z.number().int().optional().nullable(),
  timeline: z.string().optional().nullable(),
  financingType: z.string().optional().nullable(),
  preferredRegion: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  hasDocumentation: z.boolean().optional().nullable(),
  decisionMakers: z.array(z.string()).optional().nullable(),
  visitAvailability: z.string().optional().nullable(),
  urgencyLevel: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type LeadQualificationCreate = z.infer<
  typeof LeadQualificationCreateSchema
>;

export const LeadQualificationUpdateSchema = z.object({
  budgetMin: z.number().int().optional().nullable(),
  budgetMax: z.number().int().optional().nullable(),
  timeline: z.string().optional().nullable(),
  financingType: z.string().optional().nullable(),
  preferredRegion: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  hasDocumentation: z.boolean().optional().nullable(),
  decisionMakers: z.array(z.string()).optional().nullable(),
  visitAvailability: z.string().optional().nullable(),
  urgencyLevel: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type LeadQualificationUpdate = z.infer<
  typeof LeadQualificationUpdateSchema
>;

export const LeadQualificationSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  workspaceId: z.string(),
  budgetMin: z.number().int().optional().nullable(),
  budgetMax: z.number().int().optional().nullable(),
  timeline: z.string().optional().nullable(),
  financingType: z.string().optional().nullable(),
  preferredRegion: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  hasDocumentation: z.boolean().optional().nullable(),
  decisionMakers: z.array(z.string()).optional().nullable(),
  visitAvailability: z.string().optional().nullable(),
  urgencyLevel: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type LeadQualification = z.infer<typeof LeadQualificationSchema>;

export const LeadVisitCreateSchema = z.object({
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().optional().default(60),
  status: z.string().optional().default("scheduled"),
  feedbackScore: z.number().int().optional().nullable(),
  feedbackNotes: z.string().optional().nullable(),
  preVisitReminderSent: z.boolean().optional().default(false),
  postVisitFollowUpSent: z.boolean().optional().default(false),
  location: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
});
export type LeadVisitCreate = z.infer<typeof LeadVisitCreateSchema>;

export const LeadVisitUpdateSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().optional(),
  status: z.string().optional(),
  feedbackScore: z.number().int().optional().nullable(),
  feedbackNotes: z.string().optional().nullable(),
  preVisitReminderSent: z.boolean().optional(),
  postVisitFollowUpSent: z.boolean().optional(),
  location: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
});
export type LeadVisitUpdate = z.infer<typeof LeadVisitUpdateSchema>;

export const LeadVisitSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  workspaceId: z.string(),
  propertyId: z.string().optional().nullable(),
  scheduledAt: z.date(),
  durationMinutes: z.number().int().optional().nullable(),
  status: z.string().optional().nullable(),
  feedbackScore: z.number().int().optional().nullable(),
  feedbackNotes: z.string().optional().nullable(),
  preVisitReminderSent: z.boolean().optional().nullable(),
  postVisitFollowUpSent: z.boolean().optional().nullable(),
  location: z.string().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type LeadVisit = z.infer<typeof LeadVisitSchema>;

export const LeadMessageTemplateCreateSchema = z.object({
  stage: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  body: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
  order: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});
export type LeadMessageTemplateCreate = z.infer<
  typeof LeadMessageTemplateCreateSchema
>;

export const LeadMessageTemplateUpdateSchema = z.object({
  stage: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(100).optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type LeadMessageTemplateUpdate = z.infer<
  typeof LeadMessageTemplateUpdateSchema
>;

export const LeadMessageTemplateSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  stage: z.string(),
  title: z.string(),
  body: z.string(),
  variables: z.array(z.string()),
  order: z.number().int().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type LeadMessageTemplate = z.infer<typeof LeadMessageTemplateSchema>;

export const LEAD_TAG_LABELS: Record<LeadTag, string> = {
  QUENTE: "Quente",
  MORNO: "Morno",
  FRIO: "Frio",
  POS_VENDA: "Pós-Venda",
  POS_LOCACAO: "Pós-Locação",
};

export const LeadChecklistItemCreateSchema = z.object({
  columnId: z.string().optional().nullable(),
  title: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  isRequired: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
});
export type LeadChecklistItemCreate = z.infer<
  typeof LeadChecklistItemCreateSchema
>;

export const LeadChecklistItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  columnId: z.string().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
  isRequired: z.boolean().optional().nullable(),
  order: z.number().int().optional().nullable(),
  createdAt: z.date(),
});
export type LeadChecklistItem = z.infer<typeof LeadChecklistItemSchema>;

export const LeadChecklistCompletionSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  checklistItemId: z.string(),
  completedAt: z.date(),
  completedBy: z.string().optional().nullable(),
});
export type LeadChecklistCompletion = z.infer<
  typeof LeadChecklistCompletionSchema
>;

export const WorkspaceTasksFilterSchema = z.object({
  status: z
    .enum(["all", "overdue", "today", "week", "later", "completed"])
    .optional(),
  source: z.enum(["CADENCE", "VISIT", "MANUAL"]).optional(),
  assignedToId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50).optional(),
});
export type WorkspaceTasksFilter = z.infer<typeof WorkspaceTasksFilterSchema>;

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  CENTRO_IMOVEL_FORM: "Formulário do Site",
  WORKSPACE_STOREFRONT: "Vitrine do Corretor",
  PORTAL_LISTING: "Anúncio no Portal",
  CAPTACAO_STOREFRONT: "Vitrine de Captação",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  OLX: "OLX",
  ZAP_IMOVEIS: "Zap Imóveis",
  WHATSAPP: "WhatsApp",
  MANUAL: "Manual",
  EXTERNAL_API: "API Externa",
  OWNER_REFERRAL: "Indicação do Proprietário",
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  DIRECT_TRAFFIC: "Tráfego Direto",
};
