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
  | "whatsapp"
  | "other";

export type ProductCrmLead = {
  assignedUserId: string | null;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  createdAt: string;
  id: string;
  lastInteractionAt: string | null;
  listingId: string | null;
  metadata: Record<string, unknown>;
  source: CrmLeadSource;
  status: CrmLeadStatus;
  storeId: string;
  tenantId: string;
  updatedAt: string;
  vehicleTitle: string | null;
};

export type LeadActivityType =
  | "note"
  | "call"
  | "whatsapp"
  | "email"
  | "status_change"
  | "task";

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
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  listingId?: string | null;
  source: CrmLeadSource;
};

export type UpdateProductCrmLeadInput = {
  assignedUserId?: string | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
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
