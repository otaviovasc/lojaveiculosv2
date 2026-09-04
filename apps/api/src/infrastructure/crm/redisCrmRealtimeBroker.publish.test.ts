import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmRealtimeEvent } from "../../domains/crm/ports/crmRealtimePublisher.js";
import { installRedisClients } from "./redisCrmRealtimeBroker.testSupport.js";

const redisMocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("redis", () => ({ createClient: redisMocks.createClient }));

import { createRedisCrmRealtimeBroker } from "./redisCrmRealtimeBroker.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("Redis CRM realtime publishing", () => {
  beforeEach(() => redisMocks.createClient.mockReset());

  it("publishes transient presence without appending replay history", async () => {
    const { command, subscriber } = installRedisClients(
      redisMocks.createClient,
      {},
      {
        connect: vi.fn(async () => {
          throw new Error("subscriber unavailable");
        }),
      },
    );
    const broker = createRedisCrmRealtimeBroker("redis://publishing");

    await expect(broker.publish(createEvent())).resolves.toBeUndefined();

    expect(command.sendCommand).not.toHaveBeenCalledWith(
      expect.arrayContaining(["XADD"]),
    );
    expect(command.publish).toHaveBeenCalledOnce();
    expect(subscriber.connect).not.toHaveBeenCalled();
  });
});

function createEvent(): CrmRealtimeEvent {
  return {
    assignedUserId: null,
    connectionId: "connection-1",
    cycleId: "cycle-1",
    payload: { phone: "5511999999999", state: "composing" },
    storeId,
    tenantId,
    type: "presence",
  };
}
