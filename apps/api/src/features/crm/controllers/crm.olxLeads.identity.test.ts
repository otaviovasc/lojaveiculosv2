import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { recoverOlxLeadWebhooks } from "../../../domains/crm/services/CrmMessaging/recoverOlxLeadWebhooks.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  createOlxConnection,
  olxSecurity,
  olxWebhookSecret,
  storeId,
  tenantId,
} from "./crm.olxChat.testSupport.js";

describe("OLX Leads inbound identity", () => {
  it("deduplicates an official externalId after connection recreation", async () => {
    const firstConnection = createOlxConnection();
    const secondConnection = {
      ...createOlxConnection(),
      id: "24000000-0000-4000-8000-000000000102",
    };
    const { app, crmRepository, crmWebhookEventRepository } = identityTestApp([
      firstConnection,
      secondConnection,
    ]);
    const payload = { ...validPayload(), externalId: "lead-1" };

    const first = await postLead(app, firstConnection.id, payload);
    const duplicate = await postLead(app, secondConnection.id, payload);

    expect(await readResponse(first)).toMatchObject({ status: "accepted" });
    expect(await readResponse(duplicate)).toMatchObject({ status: "accepted" });
    await recover(crmRepository, crmWebhookEventRepository);
    expect(await listLeads(crmRepository)).toHaveLength(1);
  });

  it("canonicalizes fallback formatting and equivalent timestamps", async () => {
    const connection = createOlxConnection();
    const { app, crmRepository, crmWebhookEventRepository } = identityTestApp([
      connection,
    ]);

    const first = await postLead(app, connection.id, validPayload());
    const duplicate = await postLead(app, connection.id, {
      ...validPayload(),
      createdAt: "2026-08-10T09:00:00.000-03:00",
      email: " ANA@EXAMPLE.COM ",
      listId: " 123 ",
      message: " Tenho interesse ",
    });

    expect(await readResponse(duplicate)).toEqual({
      responseId: (await readResponse(first)).responseId,
      status: "duplicate",
    });
    await recover(crmRepository, crmWebhookEventRepository);
    expect(await listLeads(crmRepository)).toHaveLength(1);
  });

  it("keeps fallback identity scoped to its connection", async () => {
    const firstConnection = createOlxConnection();
    const secondConnection = {
      ...createOlxConnection(),
      id: "24000000-0000-4000-8000-000000000102",
    };
    const { app, crmRepository, crmWebhookEventRepository } = identityTestApp([
      firstConnection,
      secondConnection,
    ]);

    const first = await postLead(app, firstConnection.id, validPayload());
    const second = await postLead(app, secondConnection.id, validPayload());

    expect(await readResponse(first)).toMatchObject({ status: "accepted" });
    expect(await readResponse(second)).toMatchObject({ status: "accepted" });
    await recover(crmRepository, crmWebhookEventRepository);
    expect(await listLeads(crmRepository)).toHaveLength(2);
  });
});

function identityTestApp(
  connections: ReturnType<typeof createOlxConnection>[],
) {
  const crmRepository = createMemoryCrmRepository();
  const crmWebhookEventRepository = createMemoryCrmWebhookEventRepository();
  return {
    app: createTestApp({
      crmConnectionRepository: createTestCrmConnectionRepository(connections),
      crmOlxWebhookSecurity: olxSecurity(),
      crmRepository,
      crmWebhookEventRepository,
      entitlements: ["crm", "marketplace"],
      olxChatEnabled: true,
    }),
    crmRepository,
    crmWebhookEventRepository,
  };
}

function recover(
  crmRepository: ReturnType<typeof createMemoryCrmRepository>,
  crmWebhookEventRepository: ReturnType<
    typeof createMemoryCrmWebhookEventRepository
  >,
) {
  return recoverOlxLeadWebhooks(
    createServiceContext({
      actor: { id: "olx-lead-worker", kind: "system" },
      audit: { record: vi.fn(async () => undefined) },
      permissions: ["crm.whatsapp.ingest"],
      request: { requestId: "olx-lead-recovery" },
    }),
    { limit: 10 },
    { crmRepository, crmWebhookEventRepository } as CrmServicePorts,
  );
}

function postLead(
  app: ReturnType<typeof createTestApp>,
  connectionId: string,
  payload: Record<string, unknown>,
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/olx/${connectionId}/leads`,
    {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        "x-olx-webhook-secret": olxWebhookSecret,
      },
      method: "POST",
    },
  );
}

function validPayload() {
  return {
    createdAt: "2026-08-10T12:00:00.000Z",
    email: "ana@example.com",
    linkAd: "https://www.olx.com.br/vi/123",
    listId: "123",
    message: "Tenho interesse",
    name: "Ana",
    source: "chat",
  };
}

function listLeads(repository: ReturnType<typeof createMemoryCrmRepository>) {
  return repository.listLeads({ limit: 20, storeId, tenantId });
}

async function readResponse(response: Response) {
  return (await response.json()) as {
    responseId: string;
    status: "accepted" | "duplicate";
  };
}
