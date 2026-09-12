import { z } from "zod";

const uuid = z.string().uuid();

export const agencyTeamAccessTenantParamsSchema = z.object({
  tenantId: uuid,
});

export const agencyTeamAccessStoreParamsSchema = z.object({
  storeId: uuid,
  tenantId: uuid,
});

export const agencyTeamAccessMembershipParamsSchema = z.object({
  membershipId: uuid,
  storeId: uuid,
  tenantId: uuid,
});

export const agencyTeamAccessInvitationParamsSchema = z.object({
  invitationId: uuid,
  storeId: uuid,
  tenantId: uuid,
});
