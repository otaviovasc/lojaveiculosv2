import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM canonical Instagram connection routes", () => {
  it("creates Instagram with its provider and authorizes Composio canonically", async () => {
    const repository = createMemoryCrmConnectionRepository();
    const createConnectLink = vi.fn(async () => ({
      connectedAccountId: "ca_instagram_test",
      expiresAt: "2026-08-18T18:00:00.000Z",
      redirectUrl: "https://connect.composio.dev/cycle/instagram-test",
    }));
    const app = createTestApp({
      composioChannelOnboardingProvider: {
        createConnectLink,
        discoverInstagramResources: vi.fn(),
        discoverWhatsappResources: vi.fn(),
        subscribeInstagramApp: vi.fn(),
        subscribeWhatsappApp: vi.fn(),
        verifyConnectedAccount: vi.fn(),
      },
      crmConnectionRepository: repository,
    });

    const created = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({ channel: "instagram", provider: "meta_cloud" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(created.status).toBe(201);
    const createdBody = asJsonObject(await created.json());
    expect(createdBody).toMatchObject({
      channel: "instagram",
      displayName: "Instagram",
      provider: "meta_cloud",
    });
    const connectionId = createdBody.id;
    expect(typeof connectionId).toBe("string");
    if (typeof connectionId !== "string") {
      throw new TypeError("Expected created Instagram connection id");
    }

    const authorized = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/composio/authorize`,
      { method: "POST" },
    );

    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toMatchObject({
      redirectUrl: "https://connect.composio.dev/cycle/instagram-test",
    });
    expect(createConnectLink).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "instagram" }),
    );
    await expect(
      repository.findConnectionById(connectionId),
    ).resolves.toMatchObject({
      displayName: "Instagram",
      broker: "composio",
      channel: "instagram",
      provider: "meta_cloud",
    });
  });
});

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Expected JSON object response");
  }
  return value as Record<string, unknown>;
}
