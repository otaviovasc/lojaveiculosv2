import type { users } from "@lojaveiculosv2/db";
import type { IdentityUserSummary } from "../../../domains/identity/ports/accountProvisioningRepository.js";

export function toUserSummary(
  user: typeof users.$inferSelect,
): IdentityUserSummary {
  if (!user.clerkUserId) {
    throw new Error("Pending users do not have an authentication identity.");
  }
  return {
    clerkUserId: user.clerkUserId,
    email: user.email,
    id: user.id as never,
    name: user.name,
  };
}
