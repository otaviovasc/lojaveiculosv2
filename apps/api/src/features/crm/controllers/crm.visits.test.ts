import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmWhatsappSession } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

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
    const visit = (await created.json()) as { id: string; status: string };
    expect(visit.status).toBe("scheduled");

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

  it("rejects a WhatsApp session that is linked to another lead", async () => {
    const crmRepository = createMemoryCrmRepository();
    const firstLead = await createLead(crmRepository, "Lead Um");
    const secondLead = await createLead(crmRepository, "Lead Dois");
    const session = createWhatsappSession({
      id: "34000000-0000-4000-8000-000000000001",
      leadId: firstLead.id,
    });
    const app = createTestApp({
      crmRepository,
      crmWhatsappRepository: createMemoryCrmWhatsappRepository([session]),
      permissions: visitPermissions,
    });

    const response = await app.request("/api/v1/crm/visits", {
      body: JSON.stringify({
        leadId: secondLead.id,
        scheduledAt: "2026-07-07T14:00:00.000Z",
        sessionId: session.id,
      }),
      method: "POST",
    });

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_VISIT_SESSION_MISMATCH",
      message: "WhatsApp session is not linked to the requested lead.",
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

function createWhatsappSession(
  overrides: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  const now = new Date("2026-07-06T10:00:00.000Z");
  return {
    assignedUserId: null,
    buyerChatLid: null,
    buyerName: "Lead Um",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    channelExternalId: null,
    channelMetadata: {},
    connectionId: "24000000-0000-4000-8000-000000000101",
    createdAt: now,
    externalSessionId: null,
    firstHandledAt: null,
    freshLeadAt: now,
    humanTakeoverAt: null,
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
    sessionTags: [],
    source: null,
    status: "ACTIVE",
    storeId,
    tenantId,
    unreadCount: 0,
    updatedAt: now,
    ...overrides,
  };
}
