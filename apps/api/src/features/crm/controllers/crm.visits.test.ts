import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConversationCycle } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const visitPermissions = [
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];

describe("CRM visits routes", () => {
  it("creates, lists, updates, and completes lead visits", async () => {
    const { audit, record } = createAuditSpy();
    const crmRepository = createMemoryCrmRepository();
    const crmVisitRepository = createMemoryCrmVisitRepository();
    const transactionSpy = vi.fn();
    const transaction: NonNullable<CrmServicePorts["transaction"]> = async (
      action,
    ) => {
      transactionSpy();
      return action({ crmRepository, crmVisitRepository });
    };
    const lead = await crmRepository.createLead({
      buyerName: "Lead Visita",
      buyerPhone: "5511999999999",
      source: "manual",
      storeId,
      tenantId,
    });
    const app = createTestApp({
      audit,
      crmRepository,
      crmVisitRepository,
      permissions: visitPermissions,
      transaction,
    });

    const created = await app.request("/api/v1/crm/visits", {
      body: JSON.stringify({
        leadId: lead.id,
        notes: "Receber na loja.",
        scheduledAt: "2026-07-07T14:00:00.000Z",
      }),
      method: "POST",
    });
    expect(created.status).toBe(201);
    const visit = (await created.json()) as {
      id: string;
      listingId: string | null;
      status: string;
      vehicleTitle: string | null;
    };
    expect(visit).toMatchObject({
      listingId: null,
      status: "scheduled",
      vehicleTitle: null,
    });

    const listed = await app.request(`/api/v1/crm/visits?leadId=${lead.id}`);
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toMatchObject({
      visits: [{ id: visit.id, leadId: lead.id, notes: "Receber na loja." }],
    });

    const updated = await app.request(`/api/v1/crm/visits/${visit.id}`, {
      body: JSON.stringify({ status: "confirmed" }),
      method: "PATCH",
    });
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({
      id: visit.id,
      status: "confirmed",
    });

    const completed = await app.request(
      `/api/v1/crm/visits/${visit.id}/complete`,
      { method: "POST" },
    );
    expect(completed.status).toBe(200);
    await expect(completed.json()).resolves.toMatchObject({
      id: visit.id,
      status: "completed",
    });

    const activities = await crmRepository.listActivities({
      leadId: lead.id,
      limit: 10,
      storeId,
      tenantId,
    });
    expect(
      activities.some(
        (activity) =>
          activity.activityType === "task" &&
          activity.metadata.kind === "visit",
      ),
    ).toBe(true);
    expect(
      activities.some(
        (activity) =>
          activity.activityType === "status_change" &&
          activity.metadata.visitStatus === "completed",
      ),
    ).toBe(true);
    expect(transactionSpy).toHaveBeenCalledTimes(3);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.visit.create" }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.visit.complete" }),
    );
  });

  it("rejects a WhatsApp cycle that is linked to another lead", async () => {
    const crmRepository = createMemoryCrmRepository();
    const firstLead = await createLead(crmRepository, "Lead Um");
    const secondLead = await createLead(crmRepository, "Lead Dois");
    const cycle = createCrmConversationCycle({
      id: "34000000-0000-4000-8000-000000000001",
      leadId: firstLead.id,
    });
    const app = createTestApp({
      crmRepository,
      crmConversationRepository: createMemoryCrmConversationRepository([cycle]),
      permissions: visitPermissions,
    });

    const response = await app.request("/api/v1/crm/visits", {
      body: JSON.stringify({
        leadId: secondLead.id,
        scheduledAt: "2026-07-07T14:00:00.000Z",
        cycleId: cycle.id,
      }),
      method: "POST",
    });

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_VISIT_SESSION_MISMATCH",
      message:
        "WhatsApp conversationCycle is not linked to the requested lead.",
    });
  });

  it("returns stable errors when creating without visit permission", async () => {
    const app = createTestApp({ permissions: ["crm.visits.read"] });
    const response = await app.request("/api/v1/crm/visits", {
      body: JSON.stringify({
        leadId: "22000000-0000-4000-8000-000000000001",
        scheduledAt: "2026-07-07T14:00:00.000Z",
      }),
      method: "POST",
    });

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.visits.manage",
    });
  });
});

function createLead(
  crmRepository: ReturnType<typeof createMemoryCrmRepository>,
  buyerName: string,
) {
  return crmRepository.createLead({
    buyerName,
    buyerPhone: "5511999999999",
    source: "manual",
    storeId,
    tenantId,
  });
}

function createCrmConversationCycle(
  overrides: Partial<CrmConversationCycle> = {},
): CrmConversationCycle {
  const now = new Date("2026-07-06T10:00:00.000Z");
  return {
    assignedUserId: null,
    customerChatId: null,
    customerDisplayName: "Lead Um",
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    externalThreadId: null,
    channelMetadata: {},
    connectionId: "24000000-0000-4000-8000-000000000101",
    createdAt: now,
    externalCycleId: null,
    firstHandledAt: null,
    freshLeadAt: now,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
    id: "34000000-0000-4000-8000-000000000000",
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: now,
    lastMessageContent: "Mensagem do cliente",
    lastReadAt: null,
    leadId: null,
    messageCount: 1,
    metadata: {},
    profilePhotoUrl: null,
    revision: 0,
    tags: [],
    source: null,
    status: "ACTIVE",
    storeId,
    tenantId,
    unreadCount: 0,
    updatedAt: now,
    ...overrides,
  };
}
