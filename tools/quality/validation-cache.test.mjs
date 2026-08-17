import { describe, expect, it } from "vitest";
import {
  hasFreshValidationStep,
  recordValidationStep,
} from "./validation-cache.mjs";

describe("validation cache", () => {
  it("reuses only successful steps for the exact fresh fingerprint", () => {
    const fingerprint = `test-${process.pid}-${Date.now()}`;
    const recordedAt = Date.now();
    recordValidationStep(fingerprint, "typecheck", { now: recordedAt });

    expect(
      hasFreshValidationStep(fingerprint, "typecheck", {
        maxAgeMs: 100,
        now: recordedAt + 50,
      }),
    ).toBe(true);
    expect(
      hasFreshValidationStep(fingerprint, "test", {
        maxAgeMs: 100,
        now: recordedAt + 50,
      }),
    ).toBe(false);
    expect(
      hasFreshValidationStep(fingerprint, "typecheck", {
        maxAgeMs: 100,
        now: recordedAt + 101,
      }),
    ).toBe(false);
  });
});
