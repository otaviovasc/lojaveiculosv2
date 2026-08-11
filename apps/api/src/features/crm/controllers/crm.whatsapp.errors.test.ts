import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { WhatsappSessionRevisionConflictError } from "../../../domains/crm/whatsapp/whatsappSendErrors.js";
import { handleWhatsapp } from "./crm.whatsapp.errors.js";

describe("CRM WhatsApp error mapping", () => {
  it("maps exhausted session CAS retries to HTTP 409", async () => {
    const app = new Hono();
    app.get("/conflict", (context) =>
      handleWhatsapp(context, async () => {
        throw new WhatsappSessionRevisionConflictError("session-1");
      }),
    );

    const response = await app.request("/conflict");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_WHATSAPP_SESSION_REVISION_CONFLICT",
    });
  });
});
