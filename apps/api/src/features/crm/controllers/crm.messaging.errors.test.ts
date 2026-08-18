import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { ConversationCycleRevisionConflictError } from "../../../domains/crm/messaging/crmMessagingErrors.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/httpContextErrors.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";

describe("CRM error mapping", () => {
  it("maps missing protected HTTP identity to HTTP 401", async () => {
    const app = new Hono();
    app.get("/protected", (context) =>
      handleCrmMessaging(context, async () => {
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

  it("maps exhausted cycle CAS retries to HTTP 409", async () => {
    const app = new Hono();
    app.get("/conflict", (context) =>
      handleCrmMessaging(context, async () => {
        throw new ConversationCycleRevisionConflictError("cycle-1");
      }),
    );

    const response = await app.request("/conflict");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_CONVERSATION_CYCLE_REVISION_CONFLICT",
    });
  });
});
