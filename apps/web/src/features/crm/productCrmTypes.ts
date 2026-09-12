export type ProductCrmAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type CrmLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "negotiating"
  | "won"
  | "lost"
  | "archived";

export type CrmLeadSource =
  | "public_site"
  | "crm"
  | "external_api"
  | "manual"
  | "olx"
  | "instagram"
  | "whatsapp"
  | "other";

export type CrmLeadResponseState = "responded" | "no_response";

export type CrmLeadHumanAttendanceState = "waiting_human" | "in_human_service";

export type CrmLeadNextTask = {
  dueAt: string;
  id: string;
  title: string;
};

export type ProductCrmLead = {
  assignedUserId: string | null;
  birthDate?: string | null;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  createdAt: string;
  humanAttendanceState?: CrmLeadHumanAttendanceState | null;
  id: string;
  lastInteractionAt: string | null;
  listingId: string | null;
  metadata: Record<string, unknown>;
  nextTask?: CrmLeadNextTask | null;
  pipelineId: string | null;
  pipelineStageId: string | null;
  responseState?: CrmLeadResponseState | null;
  source: CrmLeadSource;
  status: CrmLeadStatus;
  storeId: string;
  tenantId: string;
  updatedAt: string;
  vehicleTitle: string | null;
};

export type LeadActivityType =
  "note" | "call" | "whatsapp" | "email" | "status_change" | "task";

export type LeadActivityDirection = "inbound" | "outbound" | "internal";

export type ProductCrmLeadActivity = {
  activityType: LeadActivityType;
  content: string;
  createdAt: string;
  createdByUserId: string | null;
  direction: LeadActivityDirection;
  id: string;
  leadId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  priority: number;
  storeId: string;
  tenantId: string;
  updatedAt: string;
};

export type CreateProductCrmLeadInput = {
  birthDate?: string | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  listingId?: string | null;
  metadata?: Record<string, unknown>;
  pipelineStageId?: string;
  source: CrmLeadSource;
};

export type UpdateProductCrmLeadInput = {
  assignedUserId?: string | null;
  birthDate?: string | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  metadata?: Record<string, unknown>;
  status?: CrmLeadStatus;
};

export type CreateProductCrmActivityInput = {
  activityType: LeadActivityType;
  content: string;
  direction?: LeadActivityDirection;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  priority?: number;
};

type LeadFinancialProductCommonInput = {
  idempotencyKey: string;
  occurredAt?: string;
  sellerUserId: string;
};

export type CreateLeadFinancialProductInput =
  | (LeadFinancialProductCommonInput & {
      appliedCommissionBasisPoints?: number;
      premiumCents: number;
      type: "insurance";
    })
  | (LeadFinancialProductCommonInput & {
      creditLetterAmountCents: number;
      type: "consortium";
    });

export type LeadFinancialProductResult = {
  activity: ProductCrmLeadActivity;
  entries: Array<{
    created: boolean;
    entry: {
      amountCents: number;
      id: string;
      name: string;
      type: "commission" | "expense" | "revenue";
    };
  }>;
};
