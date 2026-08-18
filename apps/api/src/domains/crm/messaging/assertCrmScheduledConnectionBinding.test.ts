import { describe, expect, it, vi } from "vitest";
import { assertCrmScheduledConnectionBinding } from "./assertCrmScheduledConnectionBinding.js";

describe("assertCrmScheduledConnectionBinding", () => {
  it("accepts the connection snapshot when the conversationCycle is unchanged", async () => {
    await expect(
      assertCrmScheduledConnectionBinding(
        { connectionId: "connection-1", cycleId: "conversationCycle-1" },
        { storeId: "store-1", tenantId: "tenant-1" },
        repositoryWithConnection("connection-1", "WHATSAPP"),
      ),
    ).resolves.toBeUndefined();
  });

  it("fails closed instead of silently switching scheduled identity", async () => {
    await expect(
      assertCrmScheduledConnectionBinding(
        {
          connectionId: "scheduled-connection",
          cycleId: "conversationCycle-1",
        },
        { storeId: "store-1", tenantId: "tenant-1" },
        repositoryWithConnection(
          "current-conversationCycle-connection",
          "WHATSAPP",
        ),
      ),
    ).rejects.toMatchObject({
      message:
        "Scheduled message connection binding no longer matches its conversationCycle.",
      status: 409,
    });
  });

  it("rejects a non-WhatsApp conversationCycle instead of sending through a mismatched channel", async () => {
    await expect(
      assertCrmScheduledConnectionBinding(
        { connectionId: "connection-1", cycleId: "conversationCycle-1" },
        { storeId: "store-1", tenantId: "tenant-1" },
        repositoryWithConnection("connection-1", "OLX_CHAT"),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

function repositoryWithConnection(
  connectionId: string,
  channel: "WHATSAPP" | "OLX_CHAT",
) {
  return {
    listConversationCycles: vi.fn(async () => [{ channel, connectionId }]),
  } as never;
}
