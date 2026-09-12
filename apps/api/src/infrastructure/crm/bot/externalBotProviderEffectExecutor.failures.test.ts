import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExternalBotEffectExecutor as createExecutor,
  externalBotConnectionFixture as fixtureConnection,
  externalBotEffectFixture as fixture,
  externalBotProviderResult as providerResult,
  externalBotWorkerInput as workerInput,
} from "./externalBotProviderEffectExecutor.testSupport.js";

vi.mock("../../db/crm/drizzleExternalBotEffectRuntime.js", () => ({
  ExternalBotCanonicalSyncIndeterminateError: class extends Error {
    readonly code = "canonical_sync_indeterminate";
  },
  loadAuthorizedExternalBotEffect: vi.fn(),
  synchronizeExternalBotEffectOutcome: vi.fn(),
  wasExternalBotProviderAttempted: vi.fn(),
}));
vi.mock(
  "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js",
  () => ({ resolveCrmProviderOperation: vi.fn() }),
);

import {
  ExternalBotCanonicalSyncIndeterminateError,
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
  wasExternalBotProviderAttempted,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";
import { resolveCrmProviderOperation } from "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js";

describe("external bot provider effect executor failures", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(synchronizeExternalBotEffectOutcome).mockResolvedValue(undefined);
    vi.mocked(wasExternalBotProviderAttempted).mockResolvedValue(false);
    vi.mocked(resolveCrmProviderOperation).mockImplementation(async (input) =>
      fixtureConnection({
        id: input.connectionId ?? "connection-default",
        storeId: input.scope.storeId as never,
        tenantId: input.scope.tenantId as never,
      }),
    );
  });

  it("fails closed when last-moment canonical authorization is unavailable", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(null);
    await expect(
      createExecutor(vi.fn()).execute(workerInput()),
    ).resolves.toEqual({
      code: "execution_authorization_failed",
      kind: "failed",
      retryable: false,
    });
  });

  it("does not retry when a previous provider attempt has no canonical evidence", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(null);
    vi.mocked(wasExternalBotProviderAttempted).mockResolvedValue(true);
    await expect(
      createExecutor(vi.fn()).execute(workerInput()),
    ).resolves.toEqual({
      code: "provider_attempt_indeterminate",
      kind: "indeterminate",
    });
  });

  it("fails closed when the explicit connection is no longer routable", async () => {
    const effect = fixture({
      action: "message.send_text",
      payload: { text: "Hello" },
    });
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(effect);
    vi.mocked(resolveCrmProviderOperation).mockRejectedValue(
      Object.assign(new Error("route blocked"), {
        code: "configuration_error",
      }),
    );
    const sendText = vi.fn();
    await expect(
      createExecutor(sendText).execute(workerInput()),
    ).resolves.toEqual({
      code: "configuration_error",
      kind: "failed",
      retryable: false,
    });
    expect(sendText).not.toHaveBeenCalled();
  });

  it("keeps provider success indeterminate when canonical synchronization needs reconciliation", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(
      fixture({ action: "message.send_text", payload: { text: "Hello" } }),
    );
    vi.mocked(synchronizeExternalBotEffectOutcome).mockRejectedValue(
      new ExternalBotCanonicalSyncIndeterminateError(),
    );
    await expect(
      createExecutor(vi.fn().mockResolvedValue(providerResult)).execute(
        workerInput(),
      ),
    ).resolves.toEqual({
      code: "delivery_indeterminate",
      kind: "indeterminate",
    });
  });

  it("does not retry a deterministic provider rejection", async () => {
    vi.mocked(loadAuthorizedExternalBotEffect).mockResolvedValue(
      fixture({ action: "message.send_text", payload: { text: "Hello" } }),
    );
    const sendText = vi.fn().mockRejectedValue(
      Object.assign(new Error("rejected"), {
        code: "provider_rejected",
        status: 502,
      }),
    );
    await expect(
      createExecutor(sendText).execute(workerInput()),
    ).resolves.toEqual({
      code: "provider_rejected",
      kind: "failed",
      retryable: false,
    });
  });
});
