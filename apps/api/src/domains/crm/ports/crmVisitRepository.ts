import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type LeadVisitStatus =
  "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";

export type CrmLeadVisit = {
  assignedUserId: UserId | null;
  createdAt: Date;
  id: string;
  leadId: string;
  notes: string | null;
  scheduledAt: Date;
  status: LeadVisitStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type ListLeadVisitsInput = {
  from?: Date;
  leadId?: string;
  limit: number;
  offset: number;
  status?: LeadVisitStatus;
  storeId: StoreId;
  tenantId: TenantId;
  to?: Date;
};

export type CreateLeadVisitInput = {
  assignedUserId?: UserId | null;
  leadId: string;
  notes?: string | null;
  scheduledAt: Date;
  status?: LeadVisitStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateLeadVisitInput = {
  assignedUserId?: UserId | null;
  notes?: string | null;
  scheduledAt?: Date;
  status?: LeadVisitStatus;
  storeId: StoreId;
  tenantId: TenantId;
  visitId: string;
};

export type CrmVisitRepository = {
  createVisit: (input: CreateLeadVisitInput) => Promise<CrmLeadVisit>;
  findVisitById: (input: {
    storeId: StoreId;
    tenantId: TenantId;
    visitId: string;
  }) => Promise<CrmLeadVisit | null>;
  listVisits: (input: ListLeadVisitsInput) => Promise<readonly CrmLeadVisit[]>;
  updateVisit: (input: UpdateLeadVisitInput) => Promise<CrmLeadVisit | null>;
};
