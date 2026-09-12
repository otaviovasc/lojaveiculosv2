import { describe, expect, it } from "vitest";
import {
  createExternalBotActionContext,
  createExternalBotActionRequest,
  withExternalBotActionDigest,
} from "../../testSupportExternalBotAction.js";
import { createMemoryExternalBotManager } from "../../testSupportExternalBotManager.js";
import { executeExternalBotAction } from "./executeExternalBotAction.js";

describe("external bot atomic reservations", () => {
  it("reserves the store daily limit for only one concurrent command", async () => {
    const manager = createMemoryExternalBotManager({
      inspect: async () => ({
        attendanceRevision: 2,
        humanAttendanceActive: false,
        revision: 4,
        scopeExists: true,
      }),
      policy: { dailyLimit: 1 },
    });
    const first = await createExternalBotActionRequest(
      manager,
      "message.send_text",
      { text: "First" },
    );
    const second = await createExternalBotActionRequest(
      manager,
      "task.create",
      { title: "Second" },
    );
    const settled = await Promise.allSettled([
      executeExternalBotAction(
        createExternalBotActionContext(),
        withExternalBotActionDigest(manager, first),
        manager.ports,
      ),
      executeExternalBotAction(
        createExternalBotActionContext(),
        withExternalBotActionDigest(manager, second),
        manager.ports,
      ),
    ]);
    expect(
      settled.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      settled.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(manager.actions.size).toBe(1);
  });
});
