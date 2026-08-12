import { describe, expect, it, vi } from "vitest";
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const legacyBotActionsPath = "/api/v1/crm/whatsapp/integrations/bot/actions";
const gone = {
  code: "CRM_WHATSAPP_LEGACY_BOT_ACTIONS_GONE",
  message: "Use POST /api/v1/crm/bot/actions with a one-time capability grant.",
} as const;

describe("CRM WhatsApp bot media action parity", () => {
  it.each(["send_image", "send_audio", "send_document"])(
    "does not execute legacy %s media actions",
    async (action) => {
      const sendMedia = vi.fn();
      const dispatch = vi.fn();
      const app = createTestApp({
        crmBotWebhookDispatcher: {
          actionApiBaseUrl: "https://api.example.test",
          dispatch,
        },
        crmWhatsappGateway: { sendMedia },
      });

      const response = await app.request(legacyBotActionsPath, {
        body: JSON.stringify({
          action,
          connectionId: "24000000-0000-4000-8000-000000000101",
          payload: {
            imageUrl: "https://cdn.example.test/vehicle.jpg",
            audioUrl: "https://cdn.example.test/vehicle.mp3",
            documentUrl: "https://cdn.example.test/vehicle.pdf",
          },
        }),
        headers: {
          "content-type": "application/json",
          "X-Webhook-Secret": "bot-webhook-secret-value-32-characters",
        },
        method: "POST",
      });

      expect(response.status).toBe(410);
      await expectApiError(response, gone);
      expect(sendMedia).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it("returns the same stable error for malformed and rate-limit-shaped requests", async () => {
    const sendMedia = vi.fn();
    const dispatch = vi.fn();
    const app = createTestApp({
      crmBotWebhookDispatcher: {
        actionApiBaseUrl: "https://api.example.test",
        dispatch,
      },
      crmWhatsappGateway: { sendMedia },
    });

    for (const payload of [
      { action: "send_image", payload: { base64: "not-used" } },
      { action: "send_image", payload: { imageUrl: "https://cdn.test/a" } },
    ]) {
      const response = await app.request(legacyBotActionsPath, {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          "X-Webhook-Secret": "bot-webhook-secret-value-32-characters",
        },
        method: "POST",
      });

      expect(response.status).toBe(410);
      await expectApiError(response, gone);
    }
    expect(sendMedia).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
