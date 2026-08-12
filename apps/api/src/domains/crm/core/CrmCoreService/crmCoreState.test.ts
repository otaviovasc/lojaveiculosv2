import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createMemoryCrmCoreRepository } from "../../testSupportCore.js";
import { CrmCoreRevisionConflictError } from "../errors.js";
import {
  createCrmCore,
  recordInboundConversation,
  startConversation,
  updateCrmCore,
} from "./index.js";

function context(tenantId = "tenant-a", storeId = "store-a") {
  return createServiceContext({
    actor: { id: "user-a", kind: "user" },
    entitlements: ["crm"],
    permissions: [
      "crm.access",
      "crm.consent.record",
      "crm.contact.merge",
      "crm.contact_identity.dispute",
      "crm.contact_identity.verify",
      "crm.manage",
    ],
    request: { requestId: `${tenantId}:${storeId}` },
    storeId,
    tenantId,
  });
}

async function contact(
  repository: ReturnType<typeof createMemoryCrmCoreRepository>,
  name = "Maria",
) {
  return createCrmCore(
    context(),
    "contacts",
    {
      disputed: false,
      displayName: name,
      mergedIntoContactId: null,
    },
    repository,
  );
}

describe("CRM core state and isolation", () => {
  it("keeps records tenant/store scoped and enforces expectedRevision", async () => {
    const repository = createMemoryCrmCoreRepository();
    const created = await contact(repository);
    await expect(
      repository.get({
        id: created.id,
        resource: "contacts",
        storeId: "store-b",
        tenantId: "tenant-a",
      }),
    ).resolves.toBeNull();
    await updateCrmCore(
      context(),
      {
        expectedRevision: 1,
        id: created.id,
        patch: { displayName: "Maria Silva" },
        resource: "contacts",
      },
      repository,
    );
    await expect(
      updateCrmCore(
        context(),
        {
          expectedRevision: 1,
          id: created.id,
          patch: { displayName: "stale" },
          resource: "contacts",
        },
        repository,
      ),
    ).rejects.toBeInstanceOf(CrmCoreRevisionConflictError);
  });

  it("starts Instagram without phone but requires phone and opt-in for WhatsApp", async () => {
    const repository = createMemoryCrmCoreRepository();
    const person = await contact(repository);
    const instagram = await repository.create({
      data: connection("instagram", "meta_cloud"),
      resource: "connections",
      scope: scope(),
    });
    const whatsapp = await repository.create({
      data: connection("whatsapp", "zapi"),
      resource: "connections",
      scope: scope(),
    });
    await expect(
      startConversation(
        context(),
        {
          connectionId: instagram.id,
          contactId: person.id,
        },
        repository,
      ),
    ).resolves.toMatchObject({ transportProvider: "meta_cloud" });
    await expect(
      startConversation(
        context(),
        {
          connectionId: whatsapp.id,
          contactId: person.id,
        },
        repository,
      ),
    ).rejects.toMatchObject({
      code: "CRM_WHATSAPP_PHONE_AND_OPT_IN_REQUIRED",
    });
  });

  it("reopens inbound and increments unread without moving pipeline or provider", async () => {
    const repository = createMemoryCrmCoreRepository();
    const person = await contact(repository);
    const connectionRow = await repository.create({
      data: connection("instagram", "meta_cloud"),
      resource: "connections",
      scope: scope(),
    });
    const started = await startConversation(
      context(),
      {
        connectionId: connectionRow.id,
        contactId: person.id,
      },
      repository,
    );
    const closed = await repository.update({
      ...scope(),
      expectedRevision: started.revision,
      id: started.id,
      patch: {
        pipelineId: "pipeline-a",
        pipelineStageId: "stage-a",
        threadState: "resolved",
      },
      resource: "conversations",
    });
    if (!closed) throw new Error("conversation missing");
    const inbound = await recordInboundConversation(
      context(),
      {
        conversationId: closed.id,
        expectedRevision: closed.revision,
      },
      repository,
    );
    expect(inbound).toMatchObject({
      pipelineId: "pipeline-a",
      pipelineStageId: "stage-a",
      threadState: "open",
      transportProvider: "meta_cloud",
      unreadCount: 1,
    });
  });
});

function scope() {
  return { storeId: "store-a", tenantId: "tenant-a" };
}

function connection(
  channel: "instagram" | "whatsapp",
  transportProvider: "meta_cloud" | "zapi",
) {
  return {
    capabilities: {
      inbound: true,
      outbound: true,
      templates: channel === "whatsapp",
    },
    channel,
    credentialBroker: "direct" as const,
    degraded: false,
    errorCode: null,
    operational: true,
    transportProvider,
  };
}
