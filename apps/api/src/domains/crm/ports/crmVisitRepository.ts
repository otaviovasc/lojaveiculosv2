import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type LeadVisitStatus =
  "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";

export type CrmLeadVisit = {
  assignedUserId: UserId | null;
  createdAt: Date;
  id: string;
  leadId: string;
  listingId: string | null;
  notes: string | null;
  scheduledAt: Date;
  status: LeadVisitStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
  vehicleTitle: string | null;
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
  listingId?: string | null;
  notes?: string | null;
  scheduledAt: Date;
  status?: LeadVisitStatus;
  storeId: StoreId;
  tenantId: TenantId;
  vehicleTitle?: string | null;
};

export type UpdateLeadVisitInput = {
  assignedUserId?: UserId | null;
  listingId?: string | null;
  notes?: string | null;
  scheduledAt?: Date;
  status?: LeadVisitStatus;
  storeId: StoreId;
  tenantId: TenantId;
  visitId: string;
  vehicleTitle?: string | null;
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
