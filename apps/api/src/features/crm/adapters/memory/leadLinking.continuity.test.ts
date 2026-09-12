import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { findOrCreateCrmMessagingLead } from "../../../../domains/crm/messaging/leadLinking.js";
import type { CrmServicePorts } from "../../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmPipelineRepository } from "./crmPipelineRepository.js";
import { createMemoryCrmRepository } from "./crmRepository.js";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("findOrCreateCrmMessagingLead continuity", () => {
  it("reuses and reopens a lost lead when the customer sends a new message", async () => {
    const ports = createPorts();
    const lost = await ports.crmRepository.createLead({
      buyerPhone: "5511985492129",
      source: "whatsapp",
      storeId,
      tenantId,
    });
    await ports.crmRepository.updateLead({
      leadId: lost.id,
      status: "lost",
      storeId,
      tenantId,
    });

    const lead = await findOrCreateCrmMessagingLead(ports, input());

    expect(lead.id).toBe(lost.id);
    expect(lead.status).toBe("new");
  });

  it("reuses a won lead for an inbound message without reopening it", async () => {
    const ports = createPorts();
    const won = await ports.crmRepository.createLead({
      buyerPhone: "+55 11 98549-2129",
      source: "whatsapp",
      storeId,
      tenantId,
    });
    await ports.crmRepository.updateLead({
      leadId: won.id,
      status: "won",
      storeId,
      tenantId,
    });

    const lead = await findOrCreateCrmMessagingLead(ports, input());

    expect(lead.id).toBe(won.id);
    expect(lead.status).toBe("won");
  });

  it("starts a fresh opportunity for staff-initiated outbound to a closed lead", async () => {
    const ports = createPorts();
    const won = await ports.crmRepository.createLead({
      buyerPhone: "5511985492129",
      source: "whatsapp",
      storeId,
      tenantId,
    });
    await ports.crmRepository.updateLead({
      leadId: won.id,
      status: "won",
      storeId,
      tenantId,
    });

    const lead = await findOrCreateCrmMessagingLead(
      ports,
      input({ direction: "OUTBOUND" }),
    );

    expect(lead.id).not.toBe(won.id);
  });
});

function createPorts() {
  return {
    crmConversationRepository: createMemoryCrmConversationRepository(),
    crmPipelineRepository: createMemoryCrmPipelineRepository(),
    crmRepository: createMemoryCrmRepository(),
  } satisfies CrmServicePorts;
}

function input(overrides: { direction?: "INBOUND" | "OUTBOUND" } = {}) {
  return {
    buyerName: null,
    buyerPhone: "5511985492129",
    channel: "WHATSAPP" as const,
    connectionId: "connection-1",
    direction: overrides.direction ?? ("INBOUND" as const),
    externalId: `message-${Math.random().toString(36).slice(2)}`,
    source: "whatsapp" as const,
    storeId,
    tenantId,
  };
}
