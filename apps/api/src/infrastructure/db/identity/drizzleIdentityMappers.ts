import type { users } from "@lojaveiculosv2/db";
import type { IdentityUserSummary } from "../../../domains/identity/ports/accountProvisioningRepository.js";

export function toUserSummary(
  user: typeof users.$inferSelect,
): IdentityUserSummary {
  return {
    clerkUserId: user.clerkUserId,
    email: user.email,
    id: user.id as never,
    name: user.name,
  };
}
