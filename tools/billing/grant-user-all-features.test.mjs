import assert from "node:assert/strict";
import test from "node:test";
import {
  oneCalendarMonthFrom,
  parseGrantArgs,
} from "./grant-user-all-features.mjs";

test("parses a positional user id with dry-run safety by default", () => {
  assert.deepEqual(parseGrantArgs(["clerk_test_owner"]), {
    apply: false,
    reason: "Staging all-feature evaluation.",
    userId: "clerk_test_owner",
  });
});

test("parses explicit apply and reason options", () => {
  assert.deepEqual(
    parseGrantArgs([
      "--user-id=00000000-0000-4000-8000-000000000001",
      "--reason=QA de integrações",
      "--apply",
    ]),
    {
      apply: true,
      reason: "QA de integrações",
      userId: "00000000-0000-4000-8000-000000000001",
    },
  );
});

test("requires a user id", () => {
  assert.throws(() => parseGrantArgs(["--apply"]), /Usage:/);
});

test("grants one calendar month without date overflow", () => {
  assert.equal(
    oneCalendarMonthFrom(new Date("2026-01-31T12:00:00.000Z")).toISOString(),
    "2026-02-28T12:00:00.000Z",
  );
  assert.equal(
    oneCalendarMonthFrom(new Date("2026-07-27T12:00:00.000Z")).toISOString(),
    "2026-08-27T12:00:00.000Z",
  );
});
