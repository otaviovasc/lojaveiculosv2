import { describe, expect, it, vi } from "vitest";
import type { ProductCrmLead } from "./productCrmTypes";
import {
  listAllCampaignLeads,
  resolveCampaignLeadAudience,
} from "./crmWhatsappCampaignSources";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

describe("CRM WhatsApp campaign sources", () => {
  it("loads every lead page instead of using only the first result set", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      createLead({ id: `lead-${index}` }),
    );
    const finalLead = createLead({ id: "lead-final" });
    const listLeads = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([finalLead]);

    const result = await listAllCampaignLeads(listLeads);

    expect(result).toHaveLength(101);
    expect(listLeads).toHaveBeenNthCalledWith(1, { limit: 100, offset: 0 });
    expect(listLeads).toHaveBeenNthCalledWith(2, { limit: 100, offset: 100 });
  });

  it("filters leads and selects only their most recent linked conversation", () => {
    const qualifiedLead = createLead({
      id: "lead-qualified",
      source: "public_site",
      status: "qualified",
    });
    const missingSessionLead = createLead({
      id: "lead-without-session",
      source: "public_site",
      status: "qualified",
    });
    const ignoredLead = createLead({ id: "lead-ignored", status: "lost" });
    const older = createSession({
      id: "session-older",
      lastMessageAt: "2026-07-01T12:00:00.000Z",
      leadId: qualifiedLead.id,
    });
    const newer = createSession({
      id: "session-newer",
      lastMessageAt: "2026-07-02T12:00:00.000Z",
      leadId: qualifiedLead.id,
    });

    const result = resolveCampaignLeadAudience(
      [qualifiedLead, missingSessionLead, ignoredLead],
      [older, newer],
      { query: "", source: "public_site", status: "qualified" },
    );

    expect(result.matchedLeadCount).toBe(2);
    expect(result.withoutSessionCount).toBe(1);
    expect(result.sessions.map((session) => session.id)).toEqual([
      "session-newer",
    ]);
  });
});

function createLead(overrides: Partial<ProductCrmLead> = {}): ProductCrmLead {
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    createdAt: "2026-07-01T12:00:00.000Z",
    id: "lead-default",
    lastInteractionAt: null,
    listingId: null,
    metadata: {},
    pipelineId: null,
    pipelineStageId: null,
    source: "whatsapp",
    status: "new",
    storeId: "store-1",
    tenantId: "tenant-1",
    updatedAt: "2026-07-01T12:00:00.000Z",
    vehicleTitle: null,
    ...overrides,
  };
}

function createSession(
  overrides: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  return {
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    id: "session-default",
    lastMessageAt: "2026-07-01T12:00:00.000Z",
    status: "ACTIVE",
    uuid: "session-default",
    ...overrides,
  };
}
