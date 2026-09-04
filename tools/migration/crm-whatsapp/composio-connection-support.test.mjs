import { describe, expect, it, vi } from "vitest";
import {
  buildSeedConnection,
  parseComposioArgs,
  resolveAuthConfigId,
  seedLocalComposioConnection,
  summarizeConnectedAccounts,
} from "./composio-connection-support.mjs";

describe("Composio CRM connection operator support", () => {
  it("parses explicit diagnose flags without accepting raw API keys", () => {
    expect(
      parseComposioArgs([
        "diagnose",
        "--",
        "--whatsapp-auth-config",
        "ac_whatsapp",
      ]),
    ).toEqual({
      command: "diagnose",
      flags: { "whatsapp-auth-config": "ac_whatsapp" },
    });
  });

  it("distinguishes auth configs from connected accounts", () => {
    expect(() =>
      resolveAuthConfigId(
        "whatsapp",
        {},
        { COMPOSIO_WHATSAPP_AUTH_CONFIG_ID: "ca_wrong_kind" },
      ),
    ).toThrow("ac_");
    expect(
      resolveAuthConfigId(
        "whatsapp",
        {},
        { COMPOSIO_WHATSAPP_AUTH_CONFIG_ID: "ac_whatsapp" },
      ),
    ).toBe("ac_whatsapp");
  });

  it("requires a ca_ account, sender ID, and Graph version for local seed", () => {
    expect(() =>
      buildSeedConnection("whatsapp", {
        "connected-account": "ac_not_connected",
        "graph-version": "v25.0",
        "sender-id": "phone-id",
      }),
    ).toThrow("ca_");
    expect(() =>
      buildSeedConnection("whatsapp", {
        "connected-account": "ca_connected",
        "sender-id": "phone-id",
      }),
    ).toThrow("graph-version");
  });

  it("builds an env-reference-only sandbox connection", () => {
    expect(
      buildSeedConnection("instagram", {
        "connected-account": "ca_instagram",
        "graph-version": "v25.0",
        "sender-id": "instagram-id",
      }),
    ).toMatchObject({
      credentialsRef: {
        composio: { connectedAccountId: "ca_instagram" },
        env: { apiKey: "COMPOSIO_API_KEY" },
        mode: "composio",
      },
      broker: "composio",
      channel: "instagram",
      externalConnectionId: "instagram-id",
      phone: null,
      provider: "meta_cloud",
      state: "sandbox",
    });
  });

  it("prints only connection identity and status from provider results", () => {
    expect(
      summarizeConnectedAccounts({
        items: [
          {
            id: "ca_one",
            state: { val: { access_token: "must-not-leak" } },
            status: "ACTIVE",
            toolkit: { slug: "whatsapp" },
          },
        ],
      }),
    ).toEqual([{ id: "ca_one", status: "ACTIVE", toolkit: "whatsapp" }]);
  });

  it("upserts only a guarded reference connection", async () => {
    const connection = buildSeedConnection("whatsapp", {
      "connected-account": "ca_whatsapp",
      "graph-version": "v25.0",
      "sender-id": "phone-id",
    });
    const unsafe = vi.fn(async () => [
      {
        broker: connection.broker,
        channel: connection.channel,
        externalConnectionId: connection.externalConnectionId,
        id: connection.id,
        provider: connection.provider,
        state: connection.state,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      },
    ]);

    await expect(
      seedLocalComposioConnection({ unsafe }, connection),
    ).resolves.toMatchObject({
      broker: "composio",
      channel: "whatsapp",
      externalConnectionId: "phone-id",
      provider: "meta_cloud",
      state: "sandbox",
    });

    expect(unsafe).toHaveBeenCalledTimes(1);
    const query = unsafe.mock.calls[0]?.[0];
    const parameters = unsafe.mock.calls[0]?.[1];
    expect(query).toContain("INSERT INTO crm_channel_connections");
    expect(query).toContain("ON CONFLICT (tenant_id, store_id, id) DO UPDATE");
    expect(query).not.toMatch(/\bcrm_connections\b/u);
    expect(query).not.toContain("credentials_ref");
    expect(query).not.toContain(" phone,");
    expect(parameters).toContain("phone-id");
    expect(JSON.stringify(parameters)).not.toContain("api-key-value");
    expect(JSON.stringify(parameters)).toContain("COMPOSIO_API_KEY");
  });

  it("does not report a canonical seed when the guarded upsert changes no row", async () => {
    const connection = buildSeedConnection("whatsapp", {
      "connected-account": "ca_whatsapp",
      "graph-version": "v25.0",
      "sender-id": "phone-id",
    });

    await expect(
      seedLocalComposioConnection(
        { unsafe: vi.fn(async () => []) },
        connection,
      ),
    ).rejects.toThrow("upsert was not confirmed");
  });
});
