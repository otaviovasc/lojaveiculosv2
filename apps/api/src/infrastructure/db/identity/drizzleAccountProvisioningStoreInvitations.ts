import type {
  CreateStoreInvitationRecordInput,
  IdentityInvitationRecord,
} from "../../../domains/identity/ports/accountProvisioningRepository.js";
import {
  createDrizzleBillingQuotaGuard,
  type DrizzleBillingQuotaClient,
} from "../billing/drizzleBillingQuotaGuard.js";
import { insertInvitation } from "./drizzleAccountProvisioningWrites.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export function createStoreInvitation(
  db: DrizzleAccountProvisioningClient,
  input: CreateStoreInvitationRecordInput,
): Promise<IdentityInvitationRecord> {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleAccountProvisioningClient;
    await createDrizzleBillingQuotaGuard(
      tx as unknown as DrizzleBillingQuotaClient,
    ).assertAvailable({
      quotaKey: "seller",
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    return insertInvitation(tx, input);
  });
}
