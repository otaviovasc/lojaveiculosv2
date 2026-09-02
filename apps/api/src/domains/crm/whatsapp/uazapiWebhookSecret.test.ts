import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { openAcceptedUazapiWebhookSecrets } from "./uazapiWebhookSecret.js";

describe("openAcceptedUazapiWebhookSecrets", () => {
  it("accepts current and bounded rotation secrets", async () => {
    const connection = testConnection({
      pendingWebhookSecret: "sealed:pending",
      pendingWebhookSecretExpiresAt: "2026-08-25T12:10:00.000Z",
      previousWebhookSecret: "sealed:previous",
      previousWebhookSecretExpiresAt: "2026-08-25T12:10:00.000Z",
      webhookSecret: "sealed:current",
    });

    await expect(
      openAcceptedUazapiWebhookSecrets(
        connection,
        ports,
        new Date("2026-08-25T12:05:00.000Z"),
      ),
    ).resolves.toEqual(["current", "pending", "previous"]);
  });

  it("drops expired overlap secrets", async () => {
    const connection = testConnection({
      pendingWebhookSecret: "sealed:pending",
      pendingWebhookSecretExpiresAt: "2026-08-25T12:00:00.000Z",
      previousWebhookSecret: "sealed:previous",
      previousWebhookSecretExpiresAt: "invalid",
      webhookSecret: "sealed:current",
    });

    await expect(
      openAcceptedUazapiWebhookSecrets(
        connection,
        ports,
        new Date("2026-08-25T12:05:00.000Z"),
      ),
    ).resolves.toEqual(["current"]);
  });

  it("opens secrets with the uazapi credential purpose", async () => {
    const opened: string[] = [];
    const recordingPorts = {
      crmConnectionCredentialVault: {
        open: async (input: { purpose: string; sealed: string }) => {
          opened.push(input.purpose);
          return input.sealed.replace(/^sealed:/u, "");
        },
        seal: async () => "sealed:unused",
      },
    } as never;

    await openAcceptedUazapiWebhookSecrets(
      testConnection({ webhookSecret: "sealed:current" }),
      recordingPorts,
    );

    expect(opened).toEqual(["uazapi.webhook-secret"]);
  });
});

const ports = {
  crmConnectionCredentialVault: {
    open: async ({ sealed }: { sealed: string }) =>
      sealed.replace(/^sealed:/u, ""),
    seal: async () => "sealed:unused",
  },
} as never;

function testConnection(stored: Record<string, unknown>): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: { mode: "stored", stored },
    displayName: "Uazapi",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection_1",
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
  };
}
