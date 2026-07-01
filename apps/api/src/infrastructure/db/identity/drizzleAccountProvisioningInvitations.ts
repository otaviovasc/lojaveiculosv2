import { and, eq, inArray, isNull } from "drizzle-orm";
import { identityInvitations } from "@lojaveiculosv2/db";
import { AccountProvisioningConflictError } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export async function assertNoActiveInvitation(
  db: DrizzleAccountProvisioningClient,
  input: {
    email: string;
    roleTemplateId: string;
    storeId: string | null;
    tenantId: string;
  },
) {
  const [existing] = await db
    .select({ id: identityInvitations.id })
    .from(identityInvitations)
    .where(
      and(
        eq(identityInvitations.email, input.email),
        eq(identityInvitations.roleTemplateId, input.roleTemplateId),
        eq(identityInvitations.tenantId, input.tenantId),
        input.storeId
          ? eq(identityInvitations.storeId, input.storeId)
          : isNull(identityInvitations.storeId),
        inArray(identityInvitations.status, ["pending", "sent"]),
      ),
    )
    .limit(1);
  if (existing) {
    throw new AccountProvisioningConflictError(
      "An active invitation already exists for this email and role.",
    );
  }
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
