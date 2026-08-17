import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  buildCrmBotConnectionStatusPayload,
  buildCrmBotWebhookPayload,
} from "./whatsappBotWebhookPayload.js";

describe("CRM bot webhook routing identity", () => {
  it("includes the actual provider connection channel", () => {
    const payload = buildCrmBotConnectionStatusPayload("https://api.test", {
      connection: connection("composio_instagram"),
      previousStatus: "paused",
      reason: "connected",
      status: "active",
      timestamp: new Date("2026-08-17T12:00:00.000Z"),
    });
    expect(payload).toMatchObject({
      channel: "instagram",
      connection: { channel: "instagram", id: "connection-1" },
      connectionId: "connection-1",
    });
  });

  it("fails closed when a session is paired with another webhook connection", () => {
    expect(() =>
      buildCrmBotWebhookPayload("https://api.test", {
        connection: connection("zapi"),
        event: "message",
        message: {} as never,
        session: { connectionId: "another-connection" } as never,
        timestamp: new Date("2026-08-17T12:00:00.000Z"),
      }),
    ).toThrow("does not match the provider event connection");
  });
});

function connection(provider: CrmConnection["provider"]): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "Connection",
    externalConnectionId: "external-1",
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider,
    status: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: null,
  };
}
