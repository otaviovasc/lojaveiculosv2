import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmRealtimeEventEnvelope } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { createCrmRealtimeBroker } from "../../../infrastructure/crm/crmRealtimeBroker.js";
import { createMemoryCrmConnectionMemberRepository } from "../adapters/memory/crmConnectionMemberRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const actorId = "02020202-0202-4202-8202-020202020202" as UserId;
const connectionA = "24000000-0000-4000-8000-000000000101";
const connectionB = "24000000-0000-4000-8000-000000000102";

async function createScopedFixture() {
  const broker = createCrmRealtimeBroker();
  const memberRepository = createMemoryCrmConnectionMemberRepository();
  await memberRepository.grantMember({
    connectionId: connectionA,
    grantedBy: null,
    storeId,
    tenantId,
    userId: actorId,
  });
  const app = createTestApp({
    crmConnectionMemberRepository: memberRepository,
    crmRealtimeBroker: broker,
    permissions: ["crm.conversations.read"],
  });
  return { app, broker };
}

async function issueTicket(
  app: ReturnType<typeof createTestApp>,
  broker: ReturnType<typeof createCrmRealtimeBroker>,
) {
  const response = await app.request("/api/v1/crm/events/ticket", {
    body: "{}",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(response.status).toBe(200);
  const { ticket } = (await response.json()) as { ticket: string };
  const scope = await broker.resolveTicket(ticket);
  expect(scope).not.toBeNull();
  return scope!;
}

function publishConnectionStatus(
  broker: ReturnType<typeof createCrmRealtimeBroker>,
  connectionId: string,
) {
  return broker.publish({
    connectionId,
    phone: null,
    status: "active",
    storeId,
    tenantId,
    type: "connection_status",
  });
}

describe("CRM realtime connection-scoped queue visibility", () => {
  it("scopes assigned-visibility tickets to the actor's member connections", async () => {
    const { app, broker } = await createScopedFixture();

    const scope = await issueTicket(app, broker);

    expect(scope.queueVisibility).toMatchObject({
      connectionIds: [connectionA],
      kind: "assigned",
      userId: actorId,
    });
  });

  it("gates replayed events by the ticket's connection scope", async () => {
    const { app, broker } = await createScopedFixture();
    const envelopes: CrmRealtimeEventEnvelope[] = [];
    broker.subscribe({
      onEvent: (envelope) => envelopes.push(envelope),
      queueVisibility: { connectionIds: null, kind: "global" },
      storeId,
      tenantId,
    });
    await publishConnectionStatus(broker, connectionB);
    await publishConnectionStatus(broker, connectionA);
    await publishConnectionStatus(broker, connectionB);
    expect(envelopes).toHaveLength(3);

    const scope = await issueTicket(app, broker);
    const visible = await broker.replay({
      connectionId: null,
      queueVisibility: scope.queueVisibility,
      sinceEventId: envelopes[0]!.id,
      storeId,
      tenantId,
    });

    expect(visible.map((envelope) => envelope.event)).toEqual([
      expect.objectContaining({
        connectionId: connectionA,
        type: "connection_status",
      }),
    ]);
  });

  it("gates live subscription delivery by the ticket's connection scope", async () => {
    const { app, broker } = await createScopedFixture();
    const scope = await issueTicket(app, broker);
    const delivered: CrmRealtimeEventEnvelope[] = [];
    broker.subscribe({
      onEvent: (envelope) => delivered.push(envelope),
      queueVisibility: scope.queueVisibility,
      storeId,
      tenantId,
    });

    await publishConnectionStatus(broker, connectionB);
    await publishConnectionStatus(broker, connectionA);

    expect(delivered.map((envelope) => envelope.event)).toEqual([
      expect.objectContaining({
        connectionId: connectionA,
        type: "connection_status",
      }),
    ]);
  });
});
