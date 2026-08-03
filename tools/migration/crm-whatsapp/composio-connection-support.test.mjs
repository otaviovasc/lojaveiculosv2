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
      phone: null,
      provider: "composio_instagram",
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
    const unsafe = vi.fn(async () => []);
    const connection = buildSeedConnection("whatsapp", {
      "connected-account": "ca_whatsapp",
      "graph-version": "v25.0",
      "sender-id": "phone-id",
    });

    await seedLocalComposioConnection({ unsafe }, connection);

    expect(unsafe).toHaveBeenCalledTimes(1);
    const parameters = unsafe.mock.calls[0]?.[1];
    expect(parameters).toContain("phone-id");
    expect(JSON.stringify(parameters)).not.toContain("api-key-value");
    expect(JSON.stringify(parameters)).toContain("COMPOSIO_API_KEY");
  });
});
