import { describe, expect, it, vi } from "vitest";
import { loadDeepLinkedCycle } from "./crmConversationHookSupport";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmConversationCycle } from "./crmConversationTypes";

describe("CRM WhatsApp hook support", () => {
  it("loads a deep-linked cycle without applying the current connection route", async () => {
    const cycle = { id: "cycle-1" } as CrmConversationCycle;
    const listConversationCycles = vi.fn(
      async (): Promise<CrmConversationCycle[]> => [cycle],
    );

    await expect(
      loadDeepLinkedCycle(
        { listConversationCycles } as Pick<
          CrmConversationApi,
          "listConversationCycles"
        >,
        cycle.id,
      ),
    ).resolves.toBe(cycle);
    expect(listConversationCycles).toHaveBeenCalledWith({
      limit: 1,
      offset: 0,
      cycleId: "cycle-1",
    });
  });
});
