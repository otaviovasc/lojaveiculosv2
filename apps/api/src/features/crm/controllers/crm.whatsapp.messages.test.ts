import { describe, expect, it, vi } from "vitest";
import { RepassesCrmRequestError } from "../../../domains/crm/acl/repassesCrmClient.js";
import {
  createAuditSpy,
  createRepassesCrmStub,
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp outbound message controller", () => {
  it("audits failed WhatsApp mutations before returning upstream errors", async () => {
    const { audit, record } = createAuditSpy();
    const repassesCrm = createRepassesCrmStub({
      sendText: vi.fn(async () => {
        throw new RepassesCrmRequestError("Forbidden upstream", 403);
      }),
    });
    const app = createTestApp(repassesCrm, { audit });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({ connectionId: 10, sessionId: 42, text: "Ola" }),
      headers: {
        Authorization: "Bearer clerk-token",
        "Content-Type": "application/json",
        "x-store-slug": "test-store",
      },
      method: "POST",
    });

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "REPASSES_CRM_REQUEST_ERROR",
      message: "Forbidden upstream",
    });
    expect(record.mock.calls.map((call) => call[0].outcome)).toEqual([
      "attempted",
      "failed",
    ]);
    expect(record.mock.calls[1]?.[0]?.metadata?.errorName).toBe(
      "RepassesCrmRequestError",
    );
  });

  it("requires WhatsApp send permission before proxying outbound messages", async () => {
    const repassesCrm = createRepassesCrmStub({ sendText: vi.fn() });
    const app = createTestApp(repassesCrm, {
      permissions: ["crm.whatsapp.list", "crm.whatsapp.read"],
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({ sessionId: 42, text: "Ola" }),
      headers: {
        Authorization: "Bearer clerk-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.whatsapp.send",
    });
    expect(repassesCrm.sendText).not.toHaveBeenCalled();
  });
});
