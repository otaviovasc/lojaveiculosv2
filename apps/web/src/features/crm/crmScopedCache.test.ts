import { describe, expect, it, vi } from "vitest";
import {
  peekCrmScopedCache,
  prefetchCrmScopedData,
  crmScheduledMessagesCacheKey,
  writeCrmScopedCache,
} from "./crmScopedCache";

describe("crmScopedCache", () => {
  it("stores and reads values per owner instance", () => {
    const ownerA = {};
    const ownerB = {};
    writeCrmScopedCache(ownerA, "key", ["a"]);
    expect(peekCrmScopedCache(ownerA, "key")).toEqual(["a"]);
    expect(peekCrmScopedCache(ownerB, "key")).toBeUndefined();
  });

  it("prefetches once and caches the result", async () => {
    const owner = {};
    const load = vi.fn(async () => [1, 2]);
    prefetchCrmScopedData(owner, "key", load);
    await vi.waitFor(() =>
      expect(peekCrmScopedCache(owner, "key")).toEqual([1, 2]),
    );
    prefetchCrmScopedData(owner, "key", load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("lets sections refetch after a failed prefetch", async () => {
    const owner = {};
    prefetchCrmScopedData(owner, "key", async () => {
      throw new Error("offline");
    });
    await vi.waitFor(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(peekCrmScopedCache(owner, "key")).toBeUndefined();
    prefetchCrmScopedData(owner, "key", async () => ["recovered"]);
    await vi.waitFor(() =>
      expect(peekCrmScopedCache(owner, "key")).toEqual(["recovered"]),
    );
  });

  it("builds connection-scoped scheduled messages keys", () => {
    expect(crmScheduledMessagesCacheKey("conn_1")).toBe(
      "scheduledMessages:conn_1",
    );
    expect(crmScheduledMessagesCacheKey(null)).toBe(
      "scheduledMessages:default",
    );
  });
});
