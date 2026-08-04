import { describe, expect, it, vi } from "vitest";
import {
  peekWhatsappScopedCache,
  prefetchWhatsappScopedData,
  whatsappScheduledMessagesCacheKey,
  writeWhatsappScopedCache,
} from "./crmWhatsappScopedCache";

describe("crmWhatsappScopedCache", () => {
  it("stores and reads values per owner instance", () => {
    const ownerA = {};
    const ownerB = {};
    writeWhatsappScopedCache(ownerA, "key", ["a"]);
    expect(peekWhatsappScopedCache(ownerA, "key")).toEqual(["a"]);
    expect(peekWhatsappScopedCache(ownerB, "key")).toBeUndefined();
  });

  it("prefetches once and caches the result", async () => {
    const owner = {};
    const load = vi.fn(async () => [1, 2]);
    prefetchWhatsappScopedData(owner, "key", load);
    await vi.waitFor(() =>
      expect(peekWhatsappScopedCache(owner, "key")).toEqual([1, 2]),
    );
    prefetchWhatsappScopedData(owner, "key", load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("lets sections refetch after a failed prefetch", async () => {
    const owner = {};
    prefetchWhatsappScopedData(owner, "key", async () => {
      throw new Error("offline");
    });
    await vi.waitFor(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(peekWhatsappScopedCache(owner, "key")).toBeUndefined();
    prefetchWhatsappScopedData(owner, "key", async () => ["recovered"]);
    await vi.waitFor(() =>
      expect(peekWhatsappScopedCache(owner, "key")).toEqual(["recovered"]),
    );
  });

  it("builds connection-scoped scheduled messages keys", () => {
    expect(whatsappScheduledMessagesCacheKey("conn_1")).toBe(
      "scheduledMessages:conn_1",
    );
    expect(whatsappScheduledMessagesCacheKey(null)).toBe(
      "scheduledMessages:default",
    );
  });
});
