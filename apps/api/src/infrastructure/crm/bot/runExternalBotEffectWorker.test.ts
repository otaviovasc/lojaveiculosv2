import { describe, expect, it, vi } from "vitest";
import { runExternalBotEffectWorkerOnce } from "./runExternalBotEffectWorker.js";

const claimRow = {
  id: "00000000-0000-4000-8000-000000000001",
  command_id: "00000000-0000-4000-8000-000000000002",
  effect_type: "message.send_text",
  idempotency_key: "idem-1",
  provider: "zapi",
  provider_connection_id: "connection-1",
};

function fakeDb(rows: Array<Record<string, unknown>>) {
  return { execute: vi.fn(async () => rows) } as never;
}

describe("runExternalBotEffectWorkerOnce", () => {
  it("returns idle when no provider effect is claimable", async () => {
    const result = await runExternalBotEffectWorkerOnce({
      authorize: vi.fn(),
      db: fakeDb([]),
      executor: { execute: vi.fn() },
    });
    expect(result).toEqual({ kind: "idle" });
  });

  it("cancels the effect when execution authorization fails", async () => {
    const authorize = vi.fn(async () => false);
    const result = await runExternalBotEffectWorkerOnce({
      authorize,
      db: fakeDb([claimRow]),
      executor: { execute: vi.fn() },
    });
    expect(result).toEqual({
      effectId: "00000000-0000-4000-8000-000000000001",
      kind: "cancelled",
    });
    expect(authorize).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("executes the mocked provider gateway effect to completion", async () => {
    const execute = vi.fn(async () => ({
      externalEffectId: "provider-message-1",
      kind: "succeeded" as const,
    }));
    const result = await runExternalBotEffectWorkerOnce({
      authorize: vi.fn(async () => true),
      db: fakeDb([claimRow]),
      executor: { execute },
    });
    expect(result).toEqual({
      effectId: "00000000-0000-4000-8000-000000000001",
      kind: "succeeded",
    });
    expect(execute).toHaveBeenCalledWith({
      effectId: "00000000-0000-4000-8000-000000000001",
      effectType: "message.send_text",
      idempotencyKey: "idem-1",
      provider: "zapi",
      providerConnectionId: "connection-1",
    });
  });

  it("schedules a retry instead of fabricating success on a retryable failure", async () => {
    const execute = vi.fn(async () => ({
      code: "timeout",
      kind: "failed" as const,
      retryable: true,
    }));
    const result = await runExternalBotEffectWorkerOnce({
      authorize: vi.fn(async () => true),
      db: fakeDb([claimRow]),
      executor: { execute },
    });
    expect(result).toEqual({
      effectId: "00000000-0000-4000-8000-000000000001",
      kind: "failed",
    });
  });
});
