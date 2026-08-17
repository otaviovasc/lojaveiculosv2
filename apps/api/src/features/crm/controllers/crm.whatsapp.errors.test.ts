import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { WhatsappSessionRevisionConflictError } from "../../../domains/crm/whatsapp/whatsappSendErrors.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/httpContextErrors.js";
import { handleWhatsapp } from "./crm.whatsapp.errors.js";

describe("CRM WhatsApp error mapping", () => {
  it("maps missing protected HTTP identity to HTTP 401", async () => {
    const app = new Hono();
    app.get("/protected", (context) =>
      handleWhatsapp(context, async () => {
        throw new HttpContextAuthenticationError(
          "Authenticated HTTP context requires Clerk user and store slug",
        );
      }),
    );

    const response = await app.request("/protected");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "HTTP_AUTHENTICATION_REQUIRED",
    });
  });

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
