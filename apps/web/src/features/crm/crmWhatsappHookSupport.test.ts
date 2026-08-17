import { describe, expect, it, vi } from "vitest";
import { loadDeepLinkedSession } from "./crmWhatsappHookSupport";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

describe("CRM WhatsApp hook support", () => {
  it("loads a deep-linked session without applying the current connection route", async () => {
    const session = { id: "session-1" } as CrmWhatsappSession;
    const listSessions = vi.fn(async (): Promise<CrmWhatsappSession[]> => [
      session,
    ]);

    await expect(
      loadDeepLinkedSession(
        { listSessions } as Pick<CrmWhatsappApi, "listSessions">,
        session.id,
      ),
    ).resolves.toBe(session);
    expect(listSessions).toHaveBeenCalledWith({
      limit: 1,
      offset: 0,
      sessionId: "session-1",
    });
  });
});
