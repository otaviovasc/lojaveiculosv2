import { describe, expect, it } from "vitest";
import {
  hasFreshValidationStep,
  recordValidationStep,
} from "./validation-cache.mjs";

describe("validation cache", () => {
  it("reuses only successful steps for the exact fresh fingerprint", () => {
    const fingerprint = `test-${process.pid}-${Date.now()}`;
    recordValidationStep(fingerprint, "typecheck", { now: 100 });

    expect(
      hasFreshValidationStep(fingerprint, "typecheck", {
        maxAgeMs: 100,
        now: 150,
      }),
    ).toBe(true);
    expect(
      hasFreshValidationStep(fingerprint, "test", {
        maxAgeMs: 100,
        now: 150,
      }),
    ).toBe(false);
    expect(
      hasFreshValidationStep(fingerprint, "typecheck", {
        maxAgeMs: 100,
        now: 201,
      }),
    ).toBe(false);
  });
});
