import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  createConnection,
  customerStoreId,
  customerTenantId,
} from "./crm.whatsapp.connectionSetupRoutes.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp connection setup routes", () => {
  it("keeps Z-API discoverable but denies first configuration without entitlement", async () => {
    const app = createTestApp({
      entitlements: ["crm"],
      billingQuotaGuard: {
        assertAvailable: vi.fn(),
        getAllowance: vi.fn(async () => ({ limit: 0, remaining: 0, used: 0 })),
      },
    });
    const overview = await app.request("/api/v1/crm/whatsapp/connections");
    expect(overview.status).toBe(200);
    const overviewBody: unknown = await overview.json();
    expect(jsonObject(overviewBody).availableProviders).toEqual(
      expect.arrayContaining(["zapi"]),
    );
    const response = await app.request("/api/v1/crm/whatsapp/connections", {
      body: JSON.stringify({
        clientToken: "client-secret-1",
        instanceId: "instance-1",
        instanceToken: "instance-secret-1",
        provider: "zapi",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(403);
  });

  it("encrypts authorized first Z-API credentials, rejects duplicates, and enables pairing", async () => {
    const repository = createMemoryCrmConnectionRepository();
    const getQrCode = vi.fn(async () => ({
      dataUri: "data:image/png;base64,customer-qr",
      expiresInSeconds: 30,
    }));
    const app = createTestApp({
      billingQuotaGuard: {
        assertAvailable: vi.fn(async () => undefined),
        getAllowance: vi.fn(async () => ({ limit: 1, remaining: 1, used: 0 })),
      },
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) =>
          sealed.replace(/^sealed:[^:]+:/u, ""),
        ),
        seal: vi.fn(
          async ({ plaintext, purpose }) => `sealed:${purpose}:${plaintext}`,
        ),
      },
      crmConnectionRepository: repository,
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(),
        getQrCode,
        validateStatus: vi.fn(),
      },
    });
    const credentials = {
      clientToken: "client-secret-1",
      instanceId: "instance-1",
      instanceToken: "instance-secret-1",
      provider: "zapi",
    } as const;

    const configured = await app.request("/api/v1/crm/whatsapp/connections", {
      body: JSON.stringify(credentials),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const configuredBody: unknown = await configured.json();
    const configuredId = jsonObject(configuredBody).id;
    expect(typeof configuredId).toBe("string");
    if (typeof configuredId !== "string") {
      throw new TypeError("Expected configured connection id");
    }
    expect(configured.status).toBe(201);
    expect(JSON.stringify(configuredBody)).not.toContain("secret-1");
    const savedConnection = await repository.findConnectionById(configuredId);
    expect(savedConnection).toMatchObject({
      credentialsRef: {
        mode: "stored",
        stored: {
          clientToken: "sealed:zapi.client-token:client-secret-1",
          instanceId: "sealed:zapi.instance-id:instance-1",
          instanceToken: "sealed:zapi.instance-token:instance-secret-1",
        },
      },
    });
    if (savedConnection?.credentialsRef.mode !== "stored") {
      throw new TypeError("Expected stored connection credentials");
    }
    expect(
      jsonObject(savedConnection.credentialsRef.stored).webhookSecret,
    ).toMatch(/^sealed:zapi\.webhook-secret:/u);

    const duplicate = await app.request("/api/v1/crm/whatsapp/connections", {
      body: JSON.stringify(credentials),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(duplicate.status).toBe(409);

    const pairing = await app.request(
      `/api/v1/crm/whatsapp/connections/${configuredId}/zapi/pairing/qr`,
      { method: "POST" },
    );
    expect(pairing.status).toBe(200);
    const pairingBody: unknown = await pairing.json();
    const pairingRecord = jsonObject(pairingBody);
    expect(typeof pairingRecord.expiresAt).toBe("string");
    expect(pairingRecord.qrCode).toBe("data:image/png;base64,customer-qr");
  });

  it("first-configures only the uncredentialed Z-API connection in the authenticated scope", async () => {
    const own = {
      ...createConnection("zapi", {}),
      storeId: customerStoreId,
      tenantId: customerTenantId,
    };
    const foreign = {
      ...createConnection("zapi", {}),
      id: "24000000-0000-4000-8000-000000000202",
      storeId: "store_2" as StoreId,
      tenantId: "tenant_2" as TenantId,
    };
    const repository = createMemoryCrmConnectionRepository([own, foreign]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      billingQuotaGuard: {
        assertAvailable: vi.fn(async () => undefined),
        getAllowance: vi.fn(async () => ({ limit: 1, remaining: 1, used: 0 })),
      },
    });
    const response = await app.request("/api/v1/crm/whatsapp/connections", {
      body: JSON.stringify({
        clientToken: "client-secret",
        instanceId: "instance-own",
        instanceToken: "instance-secret",
        provider: "zapi",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(response.status).toBe(201);
    await expect(repository.findConnectionById(own.id)).resolves.toMatchObject({
      credentialsRef: { mode: "stored" },
    });
    await expect(repository.findConnectionById(foreign.id)).resolves.toEqual(
      foreign,
    );
  });
});

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Expected JSON object response");
  }
  return value as Record<string, unknown>;
}
