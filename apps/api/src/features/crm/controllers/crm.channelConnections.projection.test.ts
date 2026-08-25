import {
  crmConnectionOverviewSchema,
  type StoreId,
  type TenantId,
} from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { projectCanonicalCrmConnectionRow } from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import {
  createZapiWebhookSetupIntent,
  requiredZapiWebhookTypes,
} from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM connection overview contract", () => {
  it("returns canonical identity, readiness, capabilities, and default facts", async () => {
    const setupIntent = createZapiWebhookSetupIntent(
      "connection_1",
      new Date("2026-08-19T18:00:00.000Z"),
    );
    const metadata = {
      capabilities: {
        conversation_start: true,
        inbound: true,
        media: true,
        outbound: true,
        scheduling: true,
        text: true,
      },
      connected: true,
      providerConnected: true,
      webhookSetup: {
        ...setupIntent,
        configuredAt: "2026-08-19T18:01:00.000Z",
        status: "configured" as const,
        succeededTypes: requiredZapiWebhookTypes,
        updatedAt: "2026-08-19T18:01:00.000Z",
      },
    };
    const legacyTransport: CrmConnection = {
      broker: "direct",
      canonical: projectCanonicalCrmConnectionRow({
        broker: "direct",
        channel: "whatsapp",
        metadata,
        provider: "zapi",
        state: "active",
      }),
      channel: "whatsapp",
      credentialsRef: {},
      displayName: "WhatsApp Z-API",
      externalConnectionId: null,
      externalInstanceId: null,
      id: "connection_1",
      metadata,
      phone: null,
      provider: "zapi",
      status: "active",
      storeId: "store_1" as StoreId,
      tenantId: "tenant_1" as TenantId,
      webhookUrl: null,
    };
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        legacyTransport,
      ]),
    });

    const response = await app.request("/api/v1/crm/channel-connections");
    const body = crmConnectionOverviewSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.connections[0]).toMatchObject({
      capabilities: [
        "inbound",
        "outbound",
        "text",
        "media",
        "scheduling",
        "conversation_start",
      ],
      channel: "whatsapp",
      displayName: "WhatsApp Z-API",
      id: "connection_1",
      isDefault: true,
      provider: "zapi",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      setup: metadata.webhookSetup,
      state: "active",
    });
    const live = body.connections[0]?.live;
    expect(live).toMatchObject({
      connected: false,
      connectedPhone: null,
      providerStatus: "unknown",
      smartphoneConnected: null,
    });
    if (!live) throw new Error("Expected live connection status.");
    expect(typeof live.checkedAt).toBe("string");
  });

  it("projects only the safe UI-demo purpose for a sandbox connection", async () => {
    const metadata = { purpose: "crm_ui_demo" };
    const demoConnection: CrmConnection = {
      broker: "composio",
      canonical: projectCanonicalCrmConnectionRow({
        broker: "composio",
        channel: "whatsapp",
        metadata,
        provider: "meta_cloud",
        state: "sandbox",
      }),
      channel: "whatsapp",
      credentialsRef: {},
      displayName: "Demonstração do CRM",
      externalConnectionId: null,
      externalInstanceId: null,
      id: "connection_demo",
      metadata,
      phone: null,
      provider: "meta_cloud",
      status: "sandbox",
      storeId: "store_1" as StoreId,
      tenantId: "tenant_1" as TenantId,
      webhookUrl: null,
    };
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        demoConnection,
      ]),
    });

    const response = await app.request("/api/v1/crm/channel-connections");
    const body = crmConnectionOverviewSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.connections[0]).toMatchObject({
      id: "connection_demo",
      purpose: "ui_demo",
      state: "sandbox",
    });
  });
});
