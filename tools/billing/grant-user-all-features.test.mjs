import assert from "node:assert/strict";
import test from "node:test";
import {
  oneCalendarMonthFrom,
  parseGrantArgs,
  resolveGrantDatabaseUrls,
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

test("uses staging database aliases when generic URLs are absent", () => {
  assert.deepEqual(
    resolveGrantDatabaseUrls({
      APP_ENV: "staging",
      STAGING_AUDIT_DB: "postgresql://audit",
      STAGING_DB: "postgresql://product",
    }),
    {
      auditDatabaseUrl: "postgresql://audit",
      databaseUrl: "postgresql://product",
    },
  );
});

test("prefers staging aliases when both names are present in staging", () => {
  assert.deepEqual(
    resolveGrantDatabaseUrls({
      APP_ENV: "staging",
      AUDIT_DATABASE_URL: "postgresql://generic-audit",
      DATABASE_URL: "postgresql://generic-product",
      STAGING_AUDIT_DB: "postgresql://staging-audit",
      STAGING_DB: "postgresql://staging-product",
    }),
    {
      auditDatabaseUrl: "postgresql://staging-audit",
      databaseUrl: "postgresql://staging-product",
    },
  );
});
