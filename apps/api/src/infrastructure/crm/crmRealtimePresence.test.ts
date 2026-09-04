import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createCrmRealtimeBroker } from "./crmRealtimeBroker.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;
const actorUserId = "02020202-0202-4202-8202-020202020202" as UserId;
const otherUserId = "03030303-0303-4303-8303-030303030303" as UserId;

describe("CRM realtime presence", () => {
  it("delivers only to the assigned queue and never replays", async () => {
    const broker = createCrmRealtimeBroker();
    const actorEvents = vi.fn();
    const otherEvents = vi.fn();
    broker.subscribe({
      onEvent: actorEvents,
      queueVisibility: { kind: "assigned", userId: actorUserId },
      storeId,
      tenantId,
    });
    broker.subscribe({
      onEvent: otherEvents,
      queueVisibility: { kind: "assigned", userId: otherUserId },
      storeId,
      tenantId,
    });

    await broker.publish({
      assignedUserId: actorUserId,
      connectionId: "connection-1",
      cycleId: "conversationCycle-1",
      payload: { phone: "5511999999999", state: "composing" },
      storeId,
      tenantId,
      type: "presence",
    });

    expect(actorEvents).toHaveBeenCalledOnce();
    expect(otherEvents).not.toHaveBeenCalled();
    await expect(
      broker.replay({
        queueVisibility: { kind: "global" },
        sinceEventId: "0-0",
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });
});
