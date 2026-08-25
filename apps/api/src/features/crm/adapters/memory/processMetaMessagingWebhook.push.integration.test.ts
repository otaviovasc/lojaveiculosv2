import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import {
  whatsappStatusValue,
  whatsappValue,
} from "../../../../domains/crm/messaging/parseMetaWebhookEvents.testSupport.js";
import type { CrmConnection } from "../../../../domains/crm/ports/crmConnectionRepository.js";
import { processMetaMessagingWebhook } from "../../../../domains/crm/services/CrmMessagingService/processMetaMessagingWebhook.js";
import { createMemoryCrmPushRepository } from "../../../../domains/crm/testSupportCrmPush.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createMemoryCrmConnectionRepository } from "./crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";
import { createMemoryCrmPipelineRepository } from "./crmPipelineRepository.js";
import { createMemoryCrmRepository } from "./crmRepository.js";
import { createMemoryCrmWebhookEventRepository } from "./crmWebhookEventRepository.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("processMetaMessagingWebhook push intents", () => {
  it("enqueues one intent for a new inbound message and none for duplicate or echo", async () => {
    const crmPushRepository = createMemoryCrmPushRepository();
    const ports = {
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        connection(),
      ]),
      crmConversationRepository: createMemoryCrmConversationRepository(),
      crmPipelineRepository: createMemoryCrmPipelineRepository(),
      crmPushRepository,
      crmRepository: createMemoryCrmRepository(),
      crmWebhookEventRepository: createMemoryCrmWebhookEventRepository(),
    };
    const inbound = whatsappValue({
      from: "5511999999999",
      id: "wamid.delivered",
      text: { body: "Tenho interesse" },
      timestamp: "1785175200",
      type: "text",
    });
    const echo = whatsappValue({
      from: "phone-number-1",
      id: "wamid.echo-1",
      is_echo: true,
      text: { body: "Resposta externa" },
      timestamp: "1785175200",
      to: "5511999999999",
      type: "text",
    });

    await expect(
      processMetaMessagingWebhook(context(), inbound, ports),
    ).resolves.toMatchObject({ processed: 1 });
    await expect(
      processMetaMessagingWebhook(context(), inbound, ports),
    ).resolves.toMatchObject({ duplicates: 1 });
    await expect(
      processMetaMessagingWebhook(context(), echo, ports),
    ).resolves.toMatchObject({ processed: 1 });
    await expect(
      processMetaMessagingWebhook(
        context(),
        whatsappStatusValue("delivered"),
        ports,
      ),
    ).resolves.toMatchObject({ processed: 1 });

    expect(crmPushRepository.listIntents()).toHaveLength(1);
    expect(crmPushRepository.listIntents()[0]).toMatchObject({
      storeId,
      tenantId,
    });
  });
});

function context() {
  return createServiceContext({
    actor: { id: "meta", kind: "integration" },
    permissions: ["crm.messages.ingest"],
    request: { requestId: crypto.randomUUID() },
    source: { component: "test", service: "api" },
  });
}

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "WhatsApp Cloud",
    externalConnectionId: "phone-number-1",
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: "5511000000000",
    provider: "meta_cloud",
    revision: 0,
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
