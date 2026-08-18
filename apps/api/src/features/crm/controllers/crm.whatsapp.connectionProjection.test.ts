import {
  crmChannelConnectionSchema,
  type StoreId,
  type TenantId,
} from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { projectCanonicalCrmConnectionRow } from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM connection overview contract", () => {
  it("returns canonical identity, readiness, capabilities, and default facts", async () => {
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
      webhookSetup: { status: "configured" },
    };
    const legacyTransport: CrmConnection = {
      canonical: projectCanonicalCrmConnectionRow({
        broker: "direct",
        channel: "whatsapp",
        metadata,
        provider: "zapi",
        state: "active",
      }),
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

    const response = await app.request("/api/v1/crm/whatsapp/connections");
    const body = (await response.json()) as {
      connections: readonly Record<string, unknown>[];
    };

    expect(response.status).toBe(200);
    expect(body.connections[0]).toMatchObject({ broker: "direct" });
    expect(crmChannelConnectionSchema.parse(body.connections[0])).toEqual({
      capabilities: ["inbound", "outbound", "scheduling"],
      channel: "whatsapp",
      displayName: "WhatsApp Z-API",
      id: "connection_1",
      isDefault: false,
      provider: "zapi",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      state: "active",
    });
  });
});
