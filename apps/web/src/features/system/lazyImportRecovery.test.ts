// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recoverFromStaleLazyImport } from "./lazyImportRecovery";

describe("recoverFromStaleLazyImport", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("reloads once when an open tab requests a chunk from a retired build", () => {
    const reload = vi.fn();
    const error = new TypeError(
      "Failed to fetch dynamically imported module: /assets/CrmInbox-old.js",
    );

    expect(
      recoverFromStaleLazyImport(error, {
        now: 1_000,
        reload,
        storage: window.sessionStorage,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledOnce();

    expect(
      recoverFromStaleLazyImport(error, {
        now: 2_000,
        reload,
        storage: window.sessionStorage,
      }),
    ).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload for ordinary render failures", () => {
    const reload = vi.fn();

    expect(
      recoverFromStaleLazyImport(new Error("Cannot read properties of null"), {
        now: 1_000,
        reload,
        storage: window.sessionStorage,
      }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("allows another recovery after the loop-protection window", () => {
    const reload = vi.fn();
    const error = new Error("Loading chunk 17 failed");

    expect(
      recoverFromStaleLazyImport(error, {
        now: 1_000,
        reload,
        storage: window.sessionStorage,
      }),
    ).toBe(true);
    expect(
      recoverFromStaleLazyImport(error, {
        now: 62_000,
        reload,
        storage: window.sessionStorage,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
