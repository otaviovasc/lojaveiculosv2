import { describe, expect, it, vi } from "vitest";
import { assertWhatsappScheduledConnectionBinding } from "./assertWhatsappScheduledConnectionBinding.js";

describe("assertWhatsappScheduledConnectionBinding", () => {
  it("accepts the connection snapshot when the session is unchanged", async () => {
    await expect(
      assertWhatsappScheduledConnectionBinding(
        { connectionId: "connection-1", sessionId: "session-1" },
        { storeId: "store-1", tenantId: "tenant-1" },
        repositoryWithConnection("connection-1", "WHATSAPP"),
      ),
    ).resolves.toBeUndefined();
  });

  it("fails closed instead of silently switching scheduled identity", async () => {
    await expect(
      assertWhatsappScheduledConnectionBinding(
        { connectionId: "scheduled-connection", sessionId: "session-1" },
        { storeId: "store-1", tenantId: "tenant-1" },
        repositoryWithConnection("current-session-connection", "WHATSAPP"),
      ),
    ).rejects.toMatchObject({
      message:
        "Scheduled message connection binding no longer matches its session.",
      status: 409,
    });
  });

  it("rejects a non-WhatsApp session instead of sending through a mismatched channel", async () => {
    await expect(
      assertWhatsappScheduledConnectionBinding(
        { connectionId: "connection-1", sessionId: "session-1" },
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
    listSessions: vi.fn(async () => [{ channel, connectionId }]),
  } as never;
}
