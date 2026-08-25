import { randomUUID } from "node:crypto";
import type { CrmPushRepository } from "../../../domains/crm/ports/crmPushRepository.js";

export async function drainDisabledCrmPushIntents(input: {
  batchSize: number;
  leaseDurationMs: number;
  now?: Date;
  repository: CrmPushRepository;
  workerId?: string;
}): Promise<{ claimed: number; released: number; staleLease: number }> {
  const now = input.now ?? new Date();
  const leases = await input.repository.claimDeliveryBatch({
    leaseDurationMs: input.leaseDurationMs,
    limit: input.batchSize,
    now,
    workerId: input.workerId ?? randomUUID(),
  });
  let released = 0;
  let staleLease = 0;
  for (const lease of leases) {
    const outcome = await input.repository.releaseGeneration({
      intentId: lease.id,
      leaseToken: lease.leaseToken,
      reason: "delivery_disabled",
      releasedAt: now,
    });
    if (outcome === "applied") released += 1;
    else staleLease += 1;
  }
  return { claimed: leases.length, released, staleLease };
}
