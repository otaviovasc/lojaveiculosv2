import { describe, expect, it, vi } from "vitest";
import { FinancingProviderGatewayError } from "../../domains/financing/ports/financingProviderGateway.js";
import { createCredereHttpGateway } from "./credereHttpGateway.js";
import { credereApiUrl } from "./credereHttpSupport.js";

describe("Credere HTTP support", () => {
  it("builds OAuth URLs from fixed Credere endpoints", async () => {
    const gateway = createCredereHttpGateway({
      auth: { clientId: "client_1", clientSecret: "secret_1" },
      fetch: vi.fn<typeof fetch>(),
    });

    const url = await gateway.createAuthorizationUrl({
      redirectUri: "https://app.example.test/credere/callback",
      state: "state_1",
    });

    expect(url).toBe(
      "https://app.meucredere.com.br/api/v1/authorize?redirect_uri=https%3A%2F%2Fapp.example.test%2Fcredere%2Fcallback&client_id=client_1&response_type=code&scope=simulator+proposals&state=state_1",
    );
    expect(new URL(url).searchParams.get("scope")).toBe("simulator proposals");
    expect(() => credereApiUrl("https://evil.example.test/token")).toThrow(
      FinancingProviderGatewayError,
    );
  });

  it("sends space-delimited OAuth scopes when exchanging the code", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ access_token: "access_1" })),
      );
    const gateway = createCredereHttpGateway({
      auth: { clientId: "client_1", clientSecret: "secret_1" },
      fetch: fetcher,
    });

    await gateway.exchangeAuthorizationCode({
      code: "code_1",
      redirectUri: "https://app.example.test/credere/callback",
    });

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      grant_type: "authorization_code",
      scope: "simulator proposals",
    });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("applies a deadline to Credere reads, writes, and revocation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      );
    const gateway = createCredereHttpGateway({
      auth: { clientId: "client_1", clientSecret: "secret_1" },
      fetch: fetcher,
    });
    const token = {
      accessToken: "access_1",
      expiresAt: null,
      providerAccountId: null,
      refreshToken: null,
      scope: null,
      tokenType: null,
    };

    await gateway.listStores({ token });
    await gateway.createLead({
      credereStoreId: "store_1",
      lead: {
        cpfCnpj: "12345678901",
        name: "Maria Silva",
        phoneNumber: "11999999999",
      },
      token,
    });
    await gateway.revokeToken("access_1");

    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [, init] of fetcher.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });
});
