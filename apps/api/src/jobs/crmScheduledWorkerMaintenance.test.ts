import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../shared/serviceContext.js";
import { runCrmScheduledWorkerMaintenance } from "./crmScheduledWorkerMaintenance.js";

describe("CRM scheduled worker maintenance", () => {
  it("is invoked by the deployed no-restart Railway cron", () => {
    const railway = readFileSync(
      new URL("../../../../.railway/railway.ts", import.meta.url),
      "utf8",
    );
    const worker = readFileSync(
      new URL("./processCrmWhatsappScheduledMessages.ts", import.meta.url),
      "utf8",
    );

    expect(railway).toContain(
      'const crmScheduleWorker = service("lojaveiculosv2-crm-schedule-worker"',
    );
    expect(railway).toContain('cronSchedule: "*/5 * * * *"');
    expect(railway).toContain('restartPolicyType: "NEVER"');
    expect(railway).toContain(
      'start: "pnpm run crm:whatsapp:schedule:process"',
    );
    expect(railway).toContain("crmScheduleWorker,");
    expect(worker).toContain("runCrmScheduledWorkerMaintenance(");
  });

  it("runs bounded connection and outbound-recovery cleanup", async () => {
    const archiveAbandonedZapiConnections = vi.fn(async () => ({
      archived: 2,
      cutoff: new Date("2026-08-03T12:00:00.000Z"),
      recoveryPayloadsPurged: 3,
    }));
    const recoverOlxWebhookEffects = vi.fn(async () => emptyOlxRecovery());
    const recoverOlxLeadWebhooks = vi.fn(async () => emptyOlxLeadRecovery());
    const context = createServiceContext({
      actor: { id: "crm_whatsapp_schedule_worker", kind: "system" },
      permissions: ["crm.messaging.connection.setup"],
      request: { requestId: "maintenance-test" },
    });

    const result = await runCrmScheduledWorkerMaintenance(
      {
        archiveAbandonedZapiConnections,
        recoverOlxLeadWebhooks,
        recoverOlxWebhookEffects,
      },
      context,
      { limit: 100 },
    );

    expect(archiveAbandonedZapiConnections).toHaveBeenCalledWith(context, {
      limit: 100,
    });
    expect(recoverOlxWebhookEffects).toHaveBeenCalledWith(context, {
      limit: 100,
    });
    expect(recoverOlxLeadWebhooks).toHaveBeenCalledWith(context, {
      limit: 100,
    });
    expect(result).toMatchObject({
      archived: 2,
      olxEffects: emptyOlxRecovery(),
      olxLeads: emptyOlxLeadRecovery(),
      recoveryPayloadsPurged: 3,
    });
  });

  it("does not block scheduled customer messages when maintenance fails", async () => {
    const context = createServiceContext({
      actor: { id: "crm_whatsapp_schedule_worker", kind: "system" },
      permissions: ["crm.messaging.connection.setup"],
      request: { requestId: "maintenance-failure-test" },
    });
    const result = await runCrmScheduledWorkerMaintenance(
      {
        archiveAbandonedZapiConnections: vi.fn(async () => {
          throw new Error("database unavailable");
        }),
        recoverOlxWebhookEffects: vi.fn(async () => emptyOlxRecovery()),
        recoverOlxLeadWebhooks: vi.fn(async () => emptyOlxLeadRecovery()),
      },
      context,
      { limit: 100 },
    );
    expect(result).toEqual({
      archived: 0,
      olxEffects: emptyOlxRecovery(),
      olxLeads: emptyOlxLeadRecovery(),
      recoveryPayloadsPurged: 0,
    });
  });
});

function emptyOlxRecovery() {
  return {
    claimed: 0,
    completedEvents: 0,
    deadLettered: 0,
    delivered: 0,
    failed: 0,
  };
}

function emptyOlxLeadRecovery() {
  return { claimed: 0, failed: 0, processed: 0 };
}
