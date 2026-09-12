import { describe, expect, it, vi } from "vitest";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import {
  completeFinancingOAuthCallback,
  completeFinancingOAuthCallbackFromState,
  startFinancingOAuthTransaction,
} from "./oauthConnectionService.js";
import { createAgencyContext, createPorts, tokenSet } from "./testSupport.js";

describe("Financing OAuth reliability", () => {
  it("retries completion with a saved token after persistence failure", async () => {
    const repository = createMemoryFinancingRepository();
    const exchangeAuthorizationCode = vi.fn(async () => tokenSet());
    const ports = createPorts(repository, { exchangeAuthorizationCode });
    const context = createAgencyContext();
    const started = await startFinancingOAuthTransaction(context, ports);
    const upsertConnection = repository.upsertConnection;
    let fails = true;
    repository.upsertConnection = async (input) => {
      if (fails) {
        fails = false;
        throw new Error("temporary persistence failure");
      }
      return upsertConnection(input);
    };

    await expect(
      completeFinancingOAuthCallback(
        context,
        { code: "oauth_code_1", state: started.state },
        ports,
      ),
    ).rejects.toThrow("temporary persistence failure");
    await expect(
      completeFinancingOAuthCallback(
        context,
        { code: "oauth_code_1", state: started.state },
        ports,
      ),
    ).resolves.toMatchObject({ status: "connected" });
    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
  });

  it("cancels a denied callback and rejects replay", async () => {
    const repository = createMemoryFinancingRepository();
    const context = createAgencyContext();
    const ports = createPorts(repository);
    const started = await startFinancingOAuthTransaction(context, ports);

    await expect(
      completeFinancingOAuthCallbackFromState(
        createAgencyContext(["financing.oauth.callback"]),
        { error: "access_denied", state: started.state },
        ports,
      ),
    ).resolves.toMatchObject({ kind: "cancelled" });
    await expect(
      completeFinancingOAuthCallback(
        context,
        { code: "oauth_code", state: started.state },
        ports,
      ),
    ).rejects.toThrow("Financing OAuth state is invalid");
  });
});
