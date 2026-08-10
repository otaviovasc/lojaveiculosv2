import { describe, expect, it, vi } from "vitest";
import { createStorefrontFeature } from "./storefront.controller.js";
import {
  createCrmRepository,
  createRepository,
} from "./storefront.controller.testSupport.js";

describe("public storefront landing-page lead route", () => {
  it("creates a CRM lead without a listing", async () => {
    const repository = createRepository();
    const crmRepository = createCrmRepository();
    const app = createStorefrontFeature({ crmRepository, repository });

    const response = await app.request("/leads", {
      body: JSON.stringify({
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        formStartedAt: Date.now() - 2_000,
        message: "Quero conhecer a loja.",
        website: "",
      }),
      headers: {
        "content-type": "application/json",
        host: "demo.lojaveiculos.com.br",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(crmRepository.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerName: "Ana Cliente",
        listingId: null,
        source: "public_site",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    const [leadInput] = vi.mocked(crmRepository.createLead).mock.calls[0] ?? [];
    expect(leadInput?.metadata).toEqual(
      expect.objectContaining({
        sourceChannel: "storefront",
        sourceSurface: "landing_page",
      }),
    );
    expect(repository.findPublicListingDetail).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "missing required contact fields",
      payload: { buyerName: "Ana Cliente" },
    },
    {
      label: "a phone with fewer than ten digits",
      payload: {
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "123456789",
        formStartedAt: Date.now() - 2_000,
        message: "Quero conhecer a loja.",
        website: "",
      },
    },
    {
      label: "a filled honeypot",
      payload: {
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        formStartedAt: Date.now() - 2_000,
        message: "Quero conhecer a loja.",
        website: "https://spam.example",
      },
    },
    {
      label: "a submission completed too quickly",
      payload: {
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        formStartedAt: Date.now() + 60_000,
        message: "Quero conhecer a loja.",
        website: "",
      },
    },
  ])("rejects $label", async ({ payload }) => {
    const crmRepository = createCrmRepository();
    const app = createStorefrontFeature({
      crmRepository,
      repository: createRepository(),
    });

    const response = await app.request("/leads", {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        host: "demo.lojaveiculos.com.br",
      },
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(crmRepository.createLead).not.toHaveBeenCalled();
  });
});
