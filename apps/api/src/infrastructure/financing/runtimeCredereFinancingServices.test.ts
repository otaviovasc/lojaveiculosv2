import { beforeEach, describe, expect, it, vi } from "vitest";

const credereGateway = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("../credere/credereHttpGateway.js", () => ({
  createCredereHttpGateway: credereGateway.create,
}));

import { createRuntimeCredereFinancingServices } from "./runtimeCredereFinancingServices.js";

describe("runtime Credere financing service bootstrap", () => {
  beforeEach(() => credereGateway.create.mockReset());

  it("keeps API bootstrap available and constructs no gateway for partial staging config", () => {
    const services = createRuntimeCredereFinancingServices(
      {},
      {
        APP_ENV: "staging",
        CREDERE_CLIENT_ID: "client_id",
        CREDERE_CLIENT_SECRET: "client_secret",
        CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
        CREDERE_REDIRECT_URI: "https://api.example.com/callback",
      },
    );

    expect(services).toBeUndefined();
    expect(credereGateway.create).not.toHaveBeenCalled();
  });

  it("constructs no gateway for an invalid sandbox root", () => {
    const services = createRuntimeCredereFinancingServices(
      {},
      {
        APP_ENV: "staging",
        CREDERE_API_ROOT: "http://sandbox.credere.example/api/v1",
        CREDERE_CLIENT_ID: "client_id",
        CREDERE_CLIENT_SECRET: "client_secret",
        CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
        CREDERE_ENVIRONMENT: "sandbox",
        CREDERE_REDIRECT_URI: "https://api.example.com/callback",
      },
    );

    expect(services).toBeUndefined();
    expect(credereGateway.create).not.toHaveBeenCalled();
  });
});
