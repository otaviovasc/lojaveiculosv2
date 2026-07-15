import { describe, expect, it } from "vitest";
import { assertSeedR2WritesAllowed } from "./storageScriptEnv.mjs";

describe("R2 seed write guard", () => {
  it("allows read-only dry runs without an allowlisted bucket", () => {
    expect(() =>
      assertSeedR2WritesAllowed({ apply: false, bucketName: "test-bucket" }),
    ).not.toThrow();
  });

  it("allows writes only when the configured bucket matches exactly", () => {
    expect(() =>
      assertSeedR2WritesAllowed({
        allowedBucket: "test-bucket",
        apply: true,
        bucketName: "test-bucket",
      }),
    ).not.toThrow();
  });

  it.each([undefined, "", "another-bucket"])(
    "rejects a missing or mismatched allowlist value (%s)",
    (allowedBucket) => {
      expect(() =>
        assertSeedR2WritesAllowed({
          allowedBucket,
          apply: true,
          bucketName: "test-bucket",
        }),
      ).toThrow("R2 seed writes are disabled");
    },
  );

  it("does not disclose bucket names in its error", () => {
    expect(() =>
      assertSeedR2WritesAllowed({
        allowedBucket: "allowed-private-name",
        apply: true,
        bucketName: "configured-private-name",
      }),
    ).toThrowError(
      new Error(
        "R2 seed writes are disabled. Set R2_SEED_WRITE_BUCKET to the exact name of the dedicated test bucket.",
      ),
    );
  });
});
