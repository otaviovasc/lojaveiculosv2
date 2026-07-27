import { describe, expect, it, vi } from "vitest";
import { createSpedyHttpFiscalAdminGateway } from "./spedyHttpFiscalAdminGateway.js";

const env = {
  SPEDY_API_URL: "https://api.spedy.test/v1/",
  SPEDY_OWNER_API_KEY: "owner-key",
  SPEDY_WEBHOOK_URL:
    "https://api.example.test/api/v1/fiscal/webhooks/spedy/opaque-token",
};

describe("spedyHttpFiscalAdminGateway", () => {
  it("uses the owner key only to create a company and returns its subaccount key", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ hasNext: false, items: [] }))
      .mockResolvedValueOnce(
        Response.json({
          apiCredentials: { apiKey: "company-subaccount-key" },
          id: "company_1",
          legalName: "Loja Teste Ltda",
          provider: { password: "must-not-leak" },
        }),
      );
    const gateway = createSpedyHttpFiscalAdminGateway({ env, fetcher });

    await expect(
      gateway.ensureCompany({
        address: {
          city: { code: 3550308, name: "São Paulo", state: "sp" },
          district: "Centro",
          number: "100",
          postalCode: "01001000",
          street: "Praça da Sé",
        },
        federalTaxNumber: "12345678000190",
        legalName: "Loja Teste Ltda",
        name: "Loja Teste",
      }),
    ).resolves.toEqual({
      apiKey: "company-subaccount-key",
      companyId: "company_1",
      created: true,
      profile: {
        id: "company_1",
        legalName: "Loja Teste Ltda",
        provider: {},
      },
    });

    const [createUrl, createRequest] = fetcher.mock.calls[1] ?? [];
    expect(createUrl).toBe("https://api.spedy.test/v1/companies");
    expect(createRequest?.method).toBe("POST");
    expect(new Headers(createRequest?.headers).get("X-Api-Key")).toBe(
      "owner-key",
    );
  });

  it("does not register a duplicate status webhook", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        items: [
          {
            event: "invoice.status_changed",
            url: env.SPEDY_WEBHOOK_URL,
          },
        ],
      }),
    );
    const gateway = createSpedyHttpFiscalAdminGateway({ env, fetcher });

    await expect(gateway.ensureWebhook()).resolves.toEqual({
      registered: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
