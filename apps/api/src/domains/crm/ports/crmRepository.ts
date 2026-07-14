import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "negotiating"
  | "won"
  | "lost"
  | "archived";

export type LeadSource =
  | "public_site"
  | "crm"
  | "external_api"
  | "manual"
  | "olx"
  | "whatsapp"
  | "other";

export type LeadActivityType =
  "note" | "call" | "whatsapp" | "email" | "status_change" | "task";

export type LeadActivityDirection = "inbound" | "outbound" | "internal";

export type CrmLead = {
  assignedUserId: UserId | null;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  createdAt: Date;
  id: string;
  lastInteractionAt: Date | null;
  listingId: string | null;
  metadata: Record<string, unknown>;
  pipelineId: string | null;
  pipelineStageId: string | null;
  source: LeadSource;
  status: LeadStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
  vehicleTitle: string | null;
};

export type CrmLeadActivity = {
  activityType: LeadActivityType;
  content: string;
  createdAt: Date;
  createdByUserId: UserId | null;
  direction: LeadActivityDirection;
  id: string;
  idempotencyFingerprint: string | null;
  idempotencyKey: string | null;
  leadId: string;
  metadata: Record<string, unknown>;
  occurredAt: Date;
  priority: number;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type CreateCrmLeadInput = {
  assignedUserId?: UserId | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  listingId?: string | null;
  metadata?: Record<string, unknown>;
  source: LeadSource;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmLeadInput = {
  assignedUserId?: UserId | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  leadId: string;
  metadata?: Record<string, unknown>;
  pipelineId?: string | null;
  pipelineStageId?: string | null;
  status?: LeadStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateLeadActivityInput = {
  activityType: LeadActivityType;
  content: string;
  createdByUserId?: UserId | null;
  direction?: LeadActivityDirection;
  leadId: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
  priority?: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateIdempotentLeadActivityInput = CreateLeadActivityInput & {
  idempotencyFingerprint: string;
  idempotencyKey: string;
};

export type CreateIdempotentLeadActivityResult = {
  activity: CrmLeadActivity;
  created: boolean;
};

export type ListCrmLeadsInput = {
  listingId?: string;
  limit: number;
  offset?: number;
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type ListLeadActivitiesInput = {
  leadId: string;
  limit: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmRepository = {
  createActivity: (input: CreateLeadActivityInput) => Promise<CrmLeadActivity>;
  createActivityIdempotently: (
    input: CreateIdempotentLeadActivityInput,
  ) => Promise<CreateIdempotentLeadActivityResult>;
  createLead: (input: CreateCrmLeadInput) => Promise<CrmLead>;
  findLeadById: (input: {
    leadId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<CrmLead | null>;
  findLeadByPhone: (input: {
    buyerPhone: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<CrmLead | null>;
  countLeadsByPipeline: (input: {
    pipelineId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<number>;
  countLeadsByPipelineStages: (input: {
    stageIds: string[];
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<number>;
  listActivities: (
    input: ListLeadActivitiesInput,
  ) => Promise<readonly CrmLeadActivity[]>;
  listLeads: (input: ListCrmLeadsInput) => Promise<readonly CrmLead[]>;
  updateLead: (input: UpdateCrmLeadInput) => Promise<CrmLead>;
};
