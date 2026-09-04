import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createZapiConnection,
  postZapiWebhook,
} from "./crm.messaging.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp LID identity", () => {
  it("backfills a matched cycle and lead without stealing unrelated cycles", async () => {
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmConversationRepository: whatsappRepository,
    });
    const chatLid = "158716288618587@lid";
    const first = await postZapiWebhook(app, {
      chatLid,
      messageId: "zapi-lid-first-1",
      phone: chatLid,
      text: { message: "Primeiro contato pelo anuncio" },
    });
    const firstBody = (await first.json()) as {
      conversationCycle: { id: string; leadId: string };
    };
    expect(first.status).toBe(201);

    const backfill = await postZapiWebhook(app, {
      chatLid,
      messageId: "zapi-lid-real-phone-1",
      phone: "5511999999999",
      text: { message: "Agora com telefone real" },
    });
    expect(backfill.status).toBe(201);
    await expect(backfill.clone().json()).resolves.toMatchObject({
      conversationCycle: {
        customerPhone: "5511999999999",
        id: firstBody.conversationCycle.id,
        leadId: firstBody.conversationCycle.leadId,
      },
    });

    await postZapiWebhook(app, {
      messageId: "zapi-unrelated-real-phone-1",
      phone: "5511988887777",
      senderName: "Outro comprador",
      text: { message: "Contato sem chatLid" },
    });
    const cycles = await whatsappRepository.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(cycles).toHaveLength(2);
    expect(
      cycles.find((cycle) => cycle.id === firstBody.conversationCycle.id),
    ).toMatchObject({ customerPhone: "5511999999999" });
    const leads = await crmRepository.listLeads({
      limit: 10,
      storeId,
      tenantId,
    });
    expect(leads).toHaveLength(2);
    expect(
      leads.find((lead) => lead.id === firstBody.conversationCycle.leadId),
    ).toMatchObject({ buyerPhone: "5511999999999" });
  });
});
