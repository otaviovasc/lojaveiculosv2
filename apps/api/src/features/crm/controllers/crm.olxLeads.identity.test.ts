import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { recoverOlxLeadWebhooks } from "../../../domains/crm/services/CrmMessagingService/recoverOlxLeadWebhooks.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  createOlxConnection,
  olxSecurity,
  olxWebhookSecret,
  storeId,
  tenantId,
} from "./crm.olxChat.testSupport.js";
import { createTestCrmConnectionCredentialVault } from "./crm.channelConnections.testSupport.js";
import type { CrmConnectionCredentialVault } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createTestCrmPipelineRepository } from "../../../domains/crm/testSupportPipeline.js";

describe("OLX Leads inbound identity", () => {
  it("deduplicates an official externalId after connection recreation", async () => {
    const firstConnection = createOlxConnection();
    const secondConnection = {
      ...createOlxConnection(),
      id: "24000000-0000-4000-8000-000000000102",
    };
    const {
      app,
      crmConnectionCredentialVault,
      crmRepository,
      crmWebhookEventRepository,
    } = identityTestApp([firstConnection, secondConnection]);
    const payload = { ...validPayload(), externalId: "lead-1" };

    const first = await postLead(app, firstConnection.id, payload);
    const duplicate = await postLead(app, secondConnection.id, payload);

    expect(await readResponse(first)).toMatchObject({ status: "accepted" });
    expect(await readResponse(duplicate)).toMatchObject({ status: "accepted" });
    await recover(
      crmConnectionCredentialVault,
      crmRepository,
      crmWebhookEventRepository,
    );
    expect(await listLeads(crmRepository)).toHaveLength(1);
  });

  it("canonicalizes fallback formatting and equivalent timestamps", async () => {
    const connection = createOlxConnection();
    const {
      app,
      crmConnectionCredentialVault,
      crmRepository,
      crmWebhookEventRepository,
    } = identityTestApp([connection]);

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
    const [event] = await crmWebhookEventRepository.list({
      limit: 1,
      storeId,
      tenantId,
    });
    const storedPayload = JSON.stringify(event?.payload);
    expect(storedPayload).not.toContain("ana@example.com");
    expect(storedPayload).not.toContain("Tenho interesse");
    expect(event?.payload).toMatchObject({ schemaVersion: 2 });
    await recover(
      crmConnectionCredentialVault,
      crmRepository,
      crmWebhookEventRepository,
    );
    expect(await listLeads(crmRepository)).toHaveLength(1);
  });

  it("keeps fallback identity scoped to its connection", async () => {
    const firstConnection = createOlxConnection();
    const secondConnection = {
      ...createOlxConnection(),
      id: "24000000-0000-4000-8000-000000000102",
    };
    const {
      app,
      crmConnectionCredentialVault,
      crmRepository,
      crmWebhookEventRepository,
    } = identityTestApp([firstConnection, secondConnection]);

    const first = await postLead(app, firstConnection.id, validPayload());
    const second = await postLead(app, secondConnection.id, validPayload());

    expect(await readResponse(first)).toMatchObject({ status: "accepted" });
    expect(await readResponse(second)).toMatchObject({ status: "accepted" });
    await recover(
      crmConnectionCredentialVault,
      crmRepository,
      crmWebhookEventRepository,
    );
    expect(await listLeads(crmRepository)).toHaveLength(2);
  });

  it("rejects a changed replay with the same official externalId", async () => {
    const connection = createOlxConnection();
    const { app } = identityTestApp([connection]);
    const payload = { ...validPayload(), externalId: "lead-1" };

    const first = await postLead(app, connection.id, payload);
    const replay = await postLead(app, connection.id, {
      ...payload,
      message: "Conteúdo divergente",
    });

    expect(first.status).toBe(200);
    expect(replay.status).toBe(409);
  });
});

function identityTestApp(
  connections: ReturnType<typeof createOlxConnection>[],
) {
  const crmRepository = createMemoryCrmRepository();
  const crmWebhookEventRepository = createMemoryCrmWebhookEventRepository();
  const crmConnectionCredentialVault = createLeadEnvelopeTestVault();
  return {
    app: createTestApp({
      crmConnectionCredentialVault,
      crmConnectionRepository: createTestCrmConnectionRepository(connections),
      crmOlxWebhookSecurity: olxSecurity(),
      crmPipelineRepository: createTestCrmPipelineRepository(),
      crmRepository,
      crmWebhookEventRepository,
      entitlements: ["crm", "marketplace"],
      olxChatEnabled: true,
    }),
    crmConnectionCredentialVault,
    crmRepository,
    crmWebhookEventRepository,
  };
}

function recover(
  crmConnectionCredentialVault: CrmConnectionCredentialVault,
  crmRepository: ReturnType<typeof createMemoryCrmRepository>,
  crmWebhookEventRepository: ReturnType<
    typeof createMemoryCrmWebhookEventRepository
  >,
) {
  return recoverOlxLeadWebhooks(
    createServiceContext({
      actor: { id: "olx-lead-worker", kind: "system" },
      audit: { record: vi.fn(async () => undefined) },
      permissions: ["crm.messages.ingest"],
      request: { requestId: "olx-lead-recovery" },
    }),
    { limit: 10 },
    {
      crmConnectionCredentialVault,
      crmPipelineRepository: createTestCrmPipelineRepository(),
      crmRepository,
      crmWebhookEventRepository,
    } as CrmServicePorts,
  );
}

function createLeadEnvelopeTestVault(): CrmConnectionCredentialVault {
  const credentials = createTestCrmConnectionCredentialVault();
  return {
    async open(input) {
      if (!input.purpose.startsWith("olx.lead-recovery:")) {
        return credentials.open(input);
      }
      return Buffer.from(input.sealed, "base64url").toString("utf8");
    },
    async seal(input) {
      if (!input.purpose.startsWith("olx.lead-recovery:")) {
        return credentials.seal(input);
      }
      return Buffer.from(input.plaintext, "utf8").toString("base64url");
    },
  };
}

function postLead(
  app: ReturnType<typeof createTestApp>,
  connectionId: string,
  payload: Record<string, unknown>,
) {
  return app.request(`/api/v1/crm/webhooks/olx/${connectionId}/leads`, {
    body: JSON.stringify(payload),
    headers: {
      authorization: `Bearer ${olxWebhookSecret}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
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
