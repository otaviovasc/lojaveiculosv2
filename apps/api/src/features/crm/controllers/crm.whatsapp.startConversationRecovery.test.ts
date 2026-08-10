import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  connectionId,
  createZapiConnection,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp start conversation recovery", () => {
  it("starts human attendance when completing a confirmed provider receipt", async () => {
    const persisted = createMemoryCrmWhatsappRepository();
    let rejectCompletionOnce = true;
    const repository = {
      ...persisted,
      updateMessage: async (
        input: Parameters<typeof persisted.updateMessage>[0],
      ) => {
        if (input.status === "SENT" && rejectCompletionOnce) {
          rejectCompletionOnce = false;
          throw new Error("local completion unavailable");
        }
        return persisted.updateMessage(input);
      },
    };
    const sendText = vi.fn(async () => ({
      externalId: "zapi-start-recovered",
      providerTimestamp: new Date("2026-08-10T15:00:00.000Z"),
      raw: { messageId: "zapi-start-recovered" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository: createMemoryCrmRepository(),
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: repository,
    });
    const body = {
      connectionId,
      idempotencyKey: "start-recovery-1",
      phone: "5511999999999",
      text: "Envio confirmado pelo provedor.",
    };

    const failed = await requestStartConversation(app, body);
    const recovered = await requestStartConversation(app, body);

    expect(failed.status).toBe(500);
    expect(recovered.status).toBe(201);
    await expect(recovered.json()).resolves.toMatchObject({
      session: {
        firstHandledAt: "2026-08-10T15:00:00.000Z",
        humanAttendanceState: "IN_HUMAN_SERVICE",
        humanAttendanceStateVersion: 1,
        status: "HUMAN_TAKEOVER",
      },
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});

function requestStartConversation(
  app: ReturnType<typeof createTestApp>,
  body: Record<string, unknown>,
) {
  return app.request("/api/v1/crm/whatsapp/conversations/start", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
