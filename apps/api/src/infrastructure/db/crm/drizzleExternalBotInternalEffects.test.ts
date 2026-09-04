import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import type { ExternalBotCommand } from "../../../domains/crm/bot/externalBotModels.js";
import { executeExternalBotInternalEffect } from "./drizzleExternalBotInternalEffects.js";

const ids = {
  command: "00000000-0000-4000-8000-000000000001",
  connection: "00000000-0000-4000-8000-000000000002",
  contact: "00000000-0000-4000-8000-000000000003",
  cycle: "00000000-0000-4000-8000-000000000004",
  effect: "00000000-0000-4000-8000-000000000005",
  integration: "00000000-0000-4000-8000-000000000006",
  listing: "00000000-0000-4000-8000-000000000007",
  opportunity: "00000000-0000-4000-8000-000000000008",
  store: "00000000-0000-4000-8000-000000000009",
  tenant: "00000000-0000-4000-8000-000000000010",
  thread: "00000000-0000-4000-8000-000000000011",
};

const commands: readonly ExternalBotCommand[] = [
  {
    action: "conversation.summarize",
    payload: { summary: "Customer wants an SUV." },
  },
  {
    action: "fact.record",
    payload: { classification: "purchase_intent", summary: "High intent." },
  },
  {
    action: "vehicle_interest.record",
    payload: { interestLevel: "high", vehicleRef: ids.listing },
  },
  { action: "handoff.request", payload: { reason: "Asked for a person." } },
  {
    action: "opportunity.open",
    payload: { summary: "Confirmed commercial intent." },
  },
  { action: "task.create", payload: { title: "Call customer" } },
  {
    action: "appointment.create",
    payload: { startsAt: "2026-08-19T12:00:00.000Z" },
  },
];

describe("external bot canonical internal effects", () => {
  it.each(commands)(
    "executes $action without a provider-effect row",
    async (command) => {
      const { db, statements } = fakeDb();

      await expect(
        executeExternalBotInternalEffect(db as never, {
          ...dispatchInput(command),
          command: command as never,
        }),
      ).resolves.toEqual({ kind: "succeeded" });

      expect(statements.join(" ")).toContain(
        "insert into crm_external_bot_internal_effects",
      );
      expect(statements.join(" ")).not.toContain(
        "insert into crm_external_bot_provider_effects",
      );
    },
  );

  it("replays a completed receipt without repeating the canonical mutation", async () => {
    const { db, statements } = fakeDb({ existingReceipt: true });
    const command = commands[0]!;

    await expect(
      executeExternalBotInternalEffect(db as never, {
        ...dispatchInput(command),
        command: command as never,
      }),
    ).resolves.toEqual({ kind: "succeeded" });

    expect(
      statements.some((statement) =>
        statement.includes("insert into observed_facts"),
      ),
    ).toBe(false);
  });

  it("fails closed before mutation when scope or revision fencing changes", async () => {
    const { db, statements } = fakeDb({ authorized: false });
    const command = commands[0]!;

    await expect(
      executeExternalBotInternalEffect(db as never, {
        ...dispatchInput(command),
        command: command as never,
      }),
    ).resolves.toEqual({
      code: "internal_effect_not_authorized",
      kind: "failed",
      retryable: false,
    });
    expect(statements).toHaveLength(1);
  });
});

function fakeDb(
  options: { authorized?: boolean; existingReceipt?: boolean } = {},
) {
  const statements: string[] = [];
  const db: FakeDb = {
    execute: vi.fn(async (statement: SQL) => {
      const query = render(statement);
      statements.push(query);
      if (query.includes("select cycle.id as cycle_id")) {
        return options.authorized === false
          ? []
          : [
              {
                contact_id: ids.contact,
                cycle_id: ids.cycle,
                opportunity_id: ids.opportunity,
              },
            ];
      }
      if (query.includes("from crm_external_bot_internal_effects")) {
        return options.existingReceipt ? [{ id: ids.command }] : [];
      }
      if (query.includes("select id from vehicle_listings"))
        return [{ id: ids.listing }];
      if (query.includes("insert into opportunities"))
        return [{ id: ids.opportunity }];
      if (query.includes("insert into vehicle_interests"))
        return [{ id: ids.effect }];
      if (query.includes("insert into observed_facts"))
        return [{ id: ids.effect }];
      if (query.includes("insert into crm_tasks")) return [{ id: ids.effect }];
      if (query.includes("insert into crm_appointments"))
        return [{ id: ids.effect }];
      if (query.includes("insert into crm_conversation_attendance_events"))
        return [{ id: ids.effect }];
      return [];
    }),
    transaction: async <T>(run: (transaction: typeof db) => Promise<T>) =>
      run(db),
  };
  return { db, statements };
}

type FakeDb = {
  execute: ReturnType<typeof vi.fn>;
  transaction<T>(run: (transaction: FakeDb) => Promise<T>): Promise<T>;
};

function dispatchInput(command: ExternalBotCommand) {
  return {
    actionId: ids.command,
    command,
    idempotencyKey: `idem-${command.action}`,
    scope: {
      channel: "whatsapp" as const,
      connectionId: ids.connection,
      expectedAttendanceRevision: 2,
      expectedRevision: 4,
      integrationId: ids.integration,
      modelVersion: "model-v1",
      provider: "zapi" as const,
      storeId: ids.store,
      tenantId: ids.tenant,
      threadId: ids.thread,
    },
  };
}

function render(statement: SQL) {
  return new PgDialect()
    .sqlToQuery(statement)
    .sql.toLowerCase()
    .replaceAll(/\s+/g, " ");
}
