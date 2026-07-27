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
      "https://app.meucredere.com.br/api/v1/authorize?redirect_uri=https%3A%2F%2Fapp.example.test%2Fcredere%2Fcallback&client_id=client_1&response_type=code&scope=simulator%2Bproposals&state=state_1",
    );
    expect(() => credereApiUrl("https://evil.example.test/token")).toThrow(
      FinancingProviderGatewayError,
    );
  });
});
