import { describe, expect, it, vi } from "vitest";
import { assertPermission } from "../shared/authorization.js";
import {
  createNoopServiceLogger,
  createServiceContext,
  type ServiceContext,
} from "../shared/serviceContext.js";
import { runCrmScheduledWorkerMaintenance } from "./crmScheduledWorkerMaintenance.js";
import {
  createCrmScheduledWorkerContext,
  createCrmScheduledWorkerMaintenanceContext,
} from "./crmScheduledWorkerContext.js";

describe("CRM scheduled worker maintenance", () => {
  it("runs bounded connection and outbound-recovery cleanup", async () => {
    const context = createCrmScheduledWorkerMaintenanceContext({
      logger: createNoopServiceLogger(),
      requestId: "maintenance-test",
    });
    const archiveAbandonedZapiConnections = vi.fn(
      async (receivedContext: ServiceContext) => {
        assertPermission(receivedContext, "crm.messaging.connection.setup");
        return {
          archived: 2,
          cutoff: new Date("2026-08-03T12:00:00.000Z"),
          recoveryPayloadsPurged: 3,
        };
      },
    );
    const recoverOlxWebhookEffects = vi.fn(async () => emptyOlxRecovery());
    const recoverOlxLeadWebhooks = vi.fn(async () => emptyOlxLeadRecovery());

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

  it("keeps setup permission scoped to maintenance context", () => {
    const input = {
      logger: createNoopServiceLogger(),
      requestId: "worker-context-test",
    };
    expect(createCrmScheduledWorkerContext(input).permissions).toEqual([
      "crm.messages.ingest",
      "crm.scheduled_messages.process",
      "crm.messages.send",
    ]);
    expect(
      createCrmScheduledWorkerMaintenanceContext(input).permissions,
    ).toEqual([
      "crm.messages.ingest",
      "crm.scheduled_messages.process",
      "crm.messages.send",
      "crm.messaging.connection.setup",
    ]);
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
