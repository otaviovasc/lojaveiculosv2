import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../../shared/serviceContext.js";
import { createMemoryExternalBotManager } from "../../testSupportExternalBotManager.js";
import { enqueueAttendanceNotification } from "./enqueueAttendanceNotification.js";

const context = createServiceContext({
  actor: { id: "user-1", kind: "user" },
  permissions: ["crm.bot.events.publish"],
  request: { requestId: "request-1" },
  storeId: "store-1",
  tenantId: "tenant-1",
});
const input = {
  channel: "whatsapp" as const,
  provider: "zapi" as const,
  connectionId: "connection-1",
  integrationId: "integration-1",
  threadId: "thread-1",
  modelVersion: "v1",
  expectedRevision: 1,
  expectedAttendanceRevision: 2,
  idempotencyKey: "attendance:cycle-1:2",
  payload: {
    channel: "whatsapp" as const,
    humanAttendanceActive: true,
    humanAttendanceState: "IN_HUMAN_SERVICE" as const,
    humanAttendanceStateVersion: 2,
  },
};
describe("enqueueAttendanceNotification", () => {
  it.each([
    { scopeExists: false, revision: 1, humanAttendanceActive: true },
    { scopeExists: true, revision: 3, humanAttendanceActive: true },
    { scopeExists: true, revision: 1, humanAttendanceActive: false },
    {
      scopeExists: true,
      revision: 1,
      humanAttendanceActive: true,
      attendanceRevision: 3,
    },
  ])("rejects a stale or mismatched scope %j", async (snapshot) => {
    const manager = createMemoryExternalBotManager({
      inspect: async () => snapshot,
    });
    await expect(
      enqueueAttendanceNotification(context, input, manager.ports),
    ).rejects.toMatchObject({ code: "CRM_BOT_SCOPE_MISMATCH" });
    expect(manager.events).toHaveLength(0);
  });
  it("honors kill switches without issuing a grant", async () => {
    const manager = createMemoryExternalBotManager({
      inspect: async () => ({
        scopeExists: true,
        revision: 1,
        humanAttendanceActive: true,
      }),
      killSwitch: "global",
    });
    const grant = vi.spyOn(manager.ports.grantStore, "issue");
    await expect(
      enqueueAttendanceNotification(context, input, manager.ports),
    ).rejects.toMatchObject({ code: "CRM_BOT_POLICY_DENIED" });
    expect(manager.events).toHaveLength(0);
    expect(grant).not.toHaveBeenCalled();
  });
});
