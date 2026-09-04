import { describe, expect, it, vi } from "vitest";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createTestApp, expectApiError } from "./crm.controller.testSupport.js";
import {
  createOlxConnection,
  olxSecurity,
  olxWebhookSecret,
  storeId,
  tenantId,
} from "./crm.olxChat.testSupport.js";
import {
  deferred,
  createOlxLeadsTestApp as testApp,
  expectSealedOlxLeadReceipt,
  fullOlxLeadPayload,
  listOlxTestLeads as listLeads,
  postOlxLead as postLead,
  readOlxLeadResponse,
  validOlxLeadPayload,
} from "./crm.olxLeads.testSupport.js";

describe("OLX Leads inbound webhook", () => {
  it("persists a sanitized durable receipt and returns a non-secret responseId", async () => {
    const crmRepository = createMemoryCrmRepository();
    const crmWebhookEventRepository = createMemoryCrmWebhookEventRepository();
    const sendText = vi.fn(async () => ({
      externalId: "must-not-send",
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
      raw: {},
    }));
    const app = testApp({ crmRepository, crmWebhookEventRepository, sendText });

    const response = await postLead(app, fullOlxLeadPayload(), "query");

    expect(response.status).toBe(200);
    const body = await readOlxLeadResponse(response);
    expect(body).toMatchObject({ status: "accepted" });
    expect(body.responseId).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toContain(olxWebhookSecret);
    expect(await listLeads(crmRepository)).toHaveLength(0);
    const [receipt] = await crmWebhookEventRepository.list({
      limit: 10,
      storeId,
      tenantId,
    });
    expect(body.responseId).toBe(receipt?.id);
    expectSealedOlxLeadReceipt(expect, receipt?.payload);
    expect(receipt?.payload).not.toHaveProperty("buyerHistory");
    expect(receipt?.payload).not.toHaveProperty("externalId");
    expect(JSON.stringify(receipt?.payload)).not.toContain(olxWebhookSecret);
    expect(receipt?.payload).not.toHaveProperty("buyerEmail");
    expect(receipt?.payload).not.toHaveProperty("buyerPhone");
    expect(JSON.stringify(receipt?.payload)).not.toContain("extra@example.com");
    expect(JSON.stringify(receipt?.payload)).not.toContain("not retained");
    expect(sendText).not.toHaveBeenCalled();
  });

  it("acknowledges after the receipt without waiting for lead processing", async () => {
    const crmRepository = createMemoryCrmRepository();
    const downstream = deferred<never>();
    crmRepository.createLeadIdempotently = vi.fn(() => downstream.promise);
    const response = await postLead(
      testApp({ crmRepository }),
      validOlxLeadPayload(),
    );
    expect(response.status).toBe(200);
    expect(await readOlxLeadResponse(response)).toMatchObject({
      status: "accepted",
    });
    expect(crmRepository.createLeadIdempotently).not.toHaveBeenCalled();
  });

  it.each([
    ["externalId", { externalId: "lead-1" }],
    ["fallback identity", {}],
  ])("deduplicates by %s", async (_label, identity) => {
    const crmRepository = createMemoryCrmRepository();
    const crmWebhookEventRepository = createMemoryCrmWebhookEventRepository();
    const app = testApp({ crmRepository, crmWebhookEventRepository });
    const payload = { ...validOlxLeadPayload(), ...identity };

    const [first, duplicate] = await Promise.all([
      postLead(app, payload),
      postLead(app, payload),
    ]);

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(await readOlxLeadResponse(duplicate)).toMatchObject({
      responseId: (await readOlxLeadResponse(first)).responseId,
      status: "duplicate",
    });
    expect(await listLeads(crmRepository)).toHaveLength(0);
    expect(
      await crmWebhookEventRepository.list({ limit: 10, storeId, tenantId }),
    ).toHaveLength(1);
  });

  it("accepts a phone-less lead", async () => {
    const crmRepository = createMemoryCrmRepository();
    const crmWebhookEventRepository = createMemoryCrmWebhookEventRepository();
    const response = await postLead(
      testApp({ crmRepository, crmWebhookEventRepository }),
      validOlxLeadPayload(),
    );

    expect(response.status).toBe(200);
    const [receipt] = await crmWebhookEventRepository.list({
      limit: 10,
      storeId,
      tenantId,
    });
    expectSealedOlxLeadReceipt(expect, receipt?.payload);
    expect(receipt?.payload).not.toHaveProperty("buyerPhone");
  });

  it("rejects malformed input without persisting it", async () => {
    const crmRepository = createMemoryCrmRepository();
    const response = await postLead(testApp({ crmRepository }), {
      ...validOlxLeadPayload(),
      email: null,
    });

    expect(response.status).toBe(400);
    expect(await listLeads(crmRepository)).toHaveLength(0);
  });

  it("rejects a wrong token", async () => {
    const response = await postLead(
      testApp({}),
      validOlxLeadPayload(),
      "header",
      "wrong",
    );

    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Invalid OLX Chat webhook token.",
    });
  });

  it("rejects a connection whose store changes after authorization", async () => {
    const first = createOlxConnection();
    const second = { ...first, storeId: "store_2" as typeof storeId };
    const base = createTestCrmConnectionRepository([first]);
    let reads = 0;
    const app = testApp({
      crmConnectionRepository: {
        ...base,
        findConnectionById: async () => (++reads === 1 ? first : second),
      },
    });

    const response = await postLead(app, validOlxLeadPayload());

    expect(response.status).toBe(403);
  });
  it("fails closed when the OLX provider is disabled", async () => {
    const response = await postLead(
      createTestApp({
        crmConnectionRepository: createTestCrmConnectionRepository([
          createOlxConnection(),
        ]),
        crmOlxWebhookSecurity: olxSecurity(),
      }),
      validOlxLeadPayload(),
    );

    expect(response.status).toBe(403);
  });

  it("accepts the CRM capability without marketplace inventory access", async () => {
    const response = await postLead(
      createTestApp({
        crmConnectionRepository: createTestCrmConnectionRepository([
          createOlxConnection(),
        ]),
        crmOlxWebhookSecurity: olxSecurity(),
        entitlements: ["crm"],
        olxChatEnabled: true,
      }),
      validOlxLeadPayload(),
    );

    expect(response.status).toBe(200);
    expect(await readOlxLeadResponse(response)).toMatchObject({
      status: "accepted",
    });
  });

  it("rejects a store without the CRM capability", async () => {
    const response = await postLead(
      createTestApp({
        crmConnectionRepository: createTestCrmConnectionRepository([
          createOlxConnection(),
        ]),
        crmOlxWebhookSecurity: olxSecurity(),
        entitlements: ["marketplace"],
        olxChatEnabled: true,
      }),
      validOlxLeadPayload(),
    );

    expect(response.status).toBe(403);
  });
});
