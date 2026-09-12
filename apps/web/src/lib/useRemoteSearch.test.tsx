// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  REMOTE_SEARCH_DELAY_MS,
  normalizeRemoteSearch,
  useRemoteSearch,
} from "./useRemoteSearch";

describe("useRemoteSearch", () => {
  it("suppresses one-character searches and debounces settled terms", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useRemoteSearch(value),
      { initialProps: { value: "" } },
    );

    rerender({ value: "a" });
    expect(result.current).toBeNull();

    rerender({ value: "an" });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(REMOTE_SEARCH_DELAY_MS);
    });
    expect(result.current).toBe("an");
    vi.useRealTimers();
  });

  it("normalizes whitespace without turning it into a remote query", () => {
    expect(normalizeRemoteSearch("   ")).toBe("");
    expect(normalizeRemoteSearch(" a ")).toBeNull();
    expect(normalizeRemoteSearch(" ana ")).toBe("ana");
  });
});
