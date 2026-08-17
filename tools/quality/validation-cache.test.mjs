import { describe, expect, it } from "vitest";
import {
  hasFreshValidationStep,
  recordValidationStep,
} from "./validation-cache.mjs";

describe("validation cache", () => {
  it("reuses only successful steps for the exact fresh fingerprint", () => {
    const baseNow = Date.now();
    const fingerprint = `test-${process.pid}-${baseNow}`;
    recordValidationStep(fingerprint, "typecheck", { now: baseNow });

    expect(
      hasFreshValidationStep(fingerprint, "typecheck", {
        maxAgeMs: 100,
        now: baseNow + 50,
      }),
    ).toBe(true);
    expect(
      hasFreshValidationStep(fingerprint, "test", {
        maxAgeMs: 100,
        now: baseNow + 50,
      }),
    ).toBe(false);
    expect(
      hasFreshValidationStep(fingerprint, "typecheck", {
        maxAgeMs: 100,
        now: baseNow + 101,
      }),
    ).toBe(false);
  });
});
