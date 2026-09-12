import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createMemoryCrmPushRepository } from "../../testSupportCrmPush.js";
import type { CrmServicePorts } from "../CrmService/types.js";
import { enqueueInboundCrmPushIntent } from "./enqueueInboundCrmPushIntent.js";

const baseInput = {
  createdMessage: true,
  cycleId: "cycle_1",
  direction: "inbound" as const,
  idempotencyKey: "11111111-1111-5111-a111-111111111111",
  messageId: "message_1",
  storeId: "store_1",
  tenantId: "tenant_1",
  threadId: "thread_1",
};

describe("enqueueInboundCrmPushIntent", () => {
  it("skips duplicate and outbound messages", async () => {
    const repository = createMemoryCrmPushRepository();
    const ports = createPorts(repository);

    expect(
      await enqueueInboundCrmPushIntent(
        context(),
        { ...baseInput, createdMessage: false },
        ports,
      ),
    ).toEqual({ kind: "skipped", reason: "duplicate" });
    expect(
      await enqueueInboundCrmPushIntent(
        context(),
        { ...baseInput, direction: "outbound" },
        ports,
      ),
    ).toEqual({ kind: "skipped", reason: "outbound" });
    expect(repository.listIntents()).toHaveLength(0);
  });

  it("claims a cycle generation once and allows a new generation", async () => {
    const repository = createMemoryCrmPushRepository();
    const ports = createPorts(repository);
    const first = await enqueueInboundCrmPushIntent(
      context(),
      baseInput,
      ports,
    );
    const duplicate = await enqueueInboundCrmPushIntent(
      context(),
      { ...baseInput, messageId: "message_2" },
      ports,
    );
    repository.setCycleGeneration("cycle_1", 1);
    const nextGeneration = await enqueueInboundCrmPushIntent(
      context(),
      { ...baseInput, messageId: "message_3" },
      ports,
    );

    expect(first.kind).toBe("enqueued");
    expect(duplicate.kind).toBe("already_claimed");
    expect(nextGeneration.kind).toBe("enqueued");
    expect(repository.listIntents().map((intent) => intent.generation)).toEqual(
      [0, 1],
    );
  });

  it("uses lease tokens as fencing identities", async () => {
    const repository = createMemoryCrmPushRepository();
    const ports = createPorts(repository);
    await enqueueInboundCrmPushIntent(context(), baseInput, ports);
    const now = new Date("2026-08-24T12:00:00.000Z");
    const [firstLease] = await repository.claimDeliveryBatch({
      leaseDurationMs: 1_000,
      limit: 1,
      now,
      workerId: "worker_1",
    });
    const [secondLease] = await repository.claimDeliveryBatch({
      leaseDurationMs: 1_000,
      limit: 1,
      now: new Date(now.getTime() + 1_001),
      workerId: "worker_2",
    });

    expect(
      await repository.markDelivered({
        deliveredAt: now,
        intentId: firstLease!.id,
        leaseToken: firstLease!.leaseToken,
        providerNotificationId: "provider_1",
      }),
    ).toBe("stale_lease");
    expect(
      await repository.markDelivered({
        deliveredAt: now,
        intentId: secondLease!.id,
        leaseToken: secondLease!.leaseToken,
        providerNotificationId: "provider_1",
      }),
    ).toBe("applied");
  });
});

function context() {
  return createServiceContext({
    actor: { id: "webhook", kind: "integration" },
    permissions: ["crm.messages.ingest"],
    request: { requestId: "request_1" },
  });
}

function createPorts(
  crmPushRepository: ReturnType<typeof createMemoryCrmPushRepository>,
): CrmServicePorts {
  return { crmPushRepository, crmRepository: {} as never };
}
