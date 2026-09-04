import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { buildZapiProviderEventId } from "../../../domains/crm/whatsapp/zapiWebhookEventKey.js";
import { processZapiWhatsappWebhookEvent } from "../../../domains/crm/services/CrmWhatsappService/processZapiWhatsappWebhookEvent.js";

describe("processZapiWhatsappWebhookEvent", () => {
  it("reclaims an event left received by a crashed delivery", async () => {
    const repository = createMemoryCrmWebhookEventRepository();
    const input = {
      connectionId: "00000000-0000-4000-8000-000000000001",
      payload: { messageId: "message-1" },
    };
    await repository.recordReceived({
      connectionId: input.connectionId,
      environment: "test",
      eventType: "crm.whatsapp.zapi.received",
      payload: input.payload,
      provider: "zapi",
      providerEventId: buildZapiProviderEventId({
        connectionId: input.connectionId,
        payload: input.payload,
        type: "received",
      }),
    });
    const process = vi.fn(async () => ({ status: "accepted" as const }));

    await expect(
      processZapiWhatsappWebhookEvent(
        createServiceContext({
          actor: { id: "zapi", kind: "integration" },
          audit: { record: vi.fn(async () => undefined) },
          permissions: ["crm.messages.ingest"],
          request: { requestId: "request-1" },
          source: { component: "test", service: "api" },
        }),
        input,
        "received",
        process,
        {
          crmRepository: createMemoryCrmRepository(),
          crmWebhookEventRepository: repository,
          environment: "test",
        },
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    expect(process).toHaveBeenCalledOnce();
  });
});
