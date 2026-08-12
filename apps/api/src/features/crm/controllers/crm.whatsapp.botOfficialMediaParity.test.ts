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

describe("CRM official bot media parity", () => {
  it.each(["composio_whatsapp", "composio_instagram"] as const)(
    "does not execute legacy media actions for %s",
    async (provider) => {
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
          action: "send_image",
          connectionId: `official-${provider}`,
          payload: { imageUrl: "https://cdn.example.test/vehicle.jpg" },
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
});
