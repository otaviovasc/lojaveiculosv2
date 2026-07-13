import { describe, expect, it } from "vitest";
import { readMinDateTimeLocal } from "./crmDateTimeLocal";

describe("readMinDateTimeLocal", () => {
  it("rounds to the next whole local minute", () => {
    const now = new Date(2026, 6, 12, 23, 59, 45, 900);

    expect(readMinDateTimeLocal(now)).toBe("2026-07-13T00:00");
  });
});
