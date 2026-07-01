import { and, eq, inArray } from "drizzle-orm";
import { identityInvitations } from "@lojaveiculosv2/db";
import type { IdentityInvitationRecord } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import { addDays } from "./drizzleAccountProvisioningInvitations.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export async function markInvitationSent(
  db: DrizzleAccountProvisioningClient,
  input: {
    allowedStatuses?: readonly IdentityInvitationRecord["status"][];
    clerkInvitationId?: string | null;
    invitationId: string;
  },
) {
  const allowedStatuses = input.allowedStatuses ?? [
    "expired",
    "pending",
    "send_failed",
    "sent",
  ];
  const updated = await db
    .update(identityInvitations)
    .set({
      clerkInvitationId: input.clerkInvitationId ?? null,
      expiresAt: addDays(new Date(), 14),
      status: "sent",
    })
    .where(
      and(
        eq(identityInvitations.id, input.invitationId),
        inArray(identityInvitations.status, [...allowedStatuses]),
      ),
    )
    .returning({ id: identityInvitations.id });
  return updated.length > 0;
}

export async function markInvitationSendFailed(
  db: DrizzleAccountProvisioningClient,
  input: { invitationId: string },
) {
  const updated = await db
    .update(identityInvitations)
    .set({ status: "send_failed" })
    .where(
      and(
        eq(identityInvitations.id, input.invitationId),
        inArray(identityInvitations.status, [
          "expired",
          "pending",
          "send_failed",
          "sent",
        ]),
      ),
    )
    .returning({ id: identityInvitations.id });
  return updated.length > 0;
}
