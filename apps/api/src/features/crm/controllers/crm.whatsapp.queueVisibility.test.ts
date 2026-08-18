import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  createZapiConnection,
  ingestText,
  otherUserId,
  storeId,
  tenantId,
} from "./crm.whatsapp.queue.testSupport.js";

const filters = ["all", "fresh", "mine", "others", "unassigned"] as const;

async function createQueueApp(permissions: PermissionKey[]) {
  const repository = createMemoryCrmWhatsappRepository();
  await ingestText(repository, {
    buyerName: "Fresh",
    buyerPhone: "5511999999921",
    content: "Lead novo",
    externalId: "visibility-fresh",
    providerTimestamp: new Date("2026-08-17T12:00:00.000Z"),
  });
  const unassigned = await ingestText(repository, {
    buyerName: "Unassigned",
    buyerPhone: "5511999999922",
    content: "Lead sem responsavel",
    externalId: "visibility-unassigned",
    providerTimestamp: new Date("2026-08-17T12:01:00.000Z"),
  });
  const mine = await ingestText(repository, {
    buyerName: "Mine",
    buyerPhone: "5511999999923",
    content: "Meu atendimento",
    externalId: "visibility-mine",
    providerTimestamp: new Date("2026-08-17T12:02:00.000Z"),
  });
  const other = await ingestText(repository, {
    buyerName: "Other",
    buyerPhone: "5511999999924",
    content: "Outro atendimento",
    externalId: "visibility-other",
    providerTimestamp: new Date("2026-08-17T12:03:00.000Z"),
  });
  await repository.updateSession({
    firstHandledAt: new Date("2026-08-17T12:01:30.000Z"),
    freshLeadAt: null,
    sessionId: unassigned.session.id,
    storeId,
    tenantId,
  });
  await repository.updateSession({
    assignedUserId: actorUserId as never,
    sessionId: mine.session.id,
    storeId,
    tenantId,
  });
  await repository.updateSession({
    assignedUserId: otherUserId as never,
    sessionId: other.session.id,
    storeId,
    tenantId,
  });
  return createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]),
    crmWhatsappRepository: repository,
    permissions,
  });
}

async function listBuyerNames(
  app: Awaited<ReturnType<typeof createQueueApp>>,
  filter: (typeof filters)[number],
  assigneeId?: string,
) {
  const query = new URLSearchParams({ connectionId, filter });
  if (assigneeId) query.set("assigneeId", assigneeId);
  const response = await app.request(
    `/api/v1/crm/whatsapp/sessions?${query.toString()}`,
  );
  expect(response.status).toBe(200);
  const body = (await response.json()) as Array<{ buyerName: string }>;
  return body.map((session) => session.buyerName).sort();
}

describe("CRM WhatsApp server-owned queue visibility", () => {
  it("limits list and counts to the restricted actor's assignments", async () => {
    const app = await createQueueApp(["crm.whatsapp.list"]);
    const expected = {
      all: ["Mine"],
      fresh: [],
      mine: ["Mine"],
      others: [],
      unassigned: [],
    } as const;

    for (const filter of filters) {
      expect(await listBuyerNames(app, filter)).toEqual(expected[filter]);
    }
    expect(await listBuyerNames(app, "all", otherUserId)).toEqual(["Mine"]);
    expect(await listBuyerNames(app, "others", otherUserId)).toEqual([]);

    const response = await app.request(
      `/api/v1/crm/whatsapp/session-counts?connectionId=${connectionId}`,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      assignees: [{ assigneeId: actorUserId, count: 1 }],
      filters: { all: 1, fresh: 0, mine: 1, others: 0, unassigned: 0 },
      total: 1,
    });
  });

  it("keeps global list and count semantics for actors who can assign", async () => {
    const app = await createQueueApp([
      "crm.whatsapp.assign",
      "crm.whatsapp.list",
    ]);
    const expected = {
      all: ["Fresh", "Mine", "Other", "Unassigned"],
      fresh: ["Fresh"],
      mine: ["Mine"],
      others: ["Other"],
      unassigned: ["Unassigned"],
    } as const;

    for (const filter of filters) {
      expect(await listBuyerNames(app, filter)).toEqual(expected[filter]);
    }
    expect(await listBuyerNames(app, "others", otherUserId)).toEqual(["Other"]);

    const response = await app.request(
      `/api/v1/crm/whatsapp/session-counts?connectionId=${connectionId}`,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      assignees: [
        { assigneeId: actorUserId, count: 1 },
        { assigneeId: otherUserId, count: 1 },
      ],
      filters: { all: 4, fresh: 1, mine: 1, others: 1, unassigned: 1 },
      total: 4,
    });
  });
});
