import { afterEach, describe, expect, it, vi } from "vitest";

const bootstrap = vi.hoisted(() => vi.fn());

vi.mock("./runtimeApi", () => ({
  createRuntimeAccountApi: async () => ({ bootstrap }),
}));

import {
  loadRuntimeSessionBootstrap,
  SessionBootstrapTimeoutError,
} from "./sessionBootstrapLoader";

describe("session bootstrap loader", () => {
  afterEach(() => {
    bootstrap.mockReset();
    vi.useRealTimers();
  });

  it("aborts the API request and rejects when bootstrap exceeds its deadline", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    bootstrap.mockImplementation(
      (input?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          requestSignal = input?.signal;
          requestSignal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    const result = expect(
      loadRuntimeSessionBootstrap(async () => "token", 250),
    ).rejects.toBeInstanceOf(SessionBootstrapTimeoutError);
    await vi.advanceTimersByTimeAsync(250);

    await result;
    expect(requestSignal?.aborted).toBe(true);
  });
});
