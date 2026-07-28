import assert from "node:assert/strict";
import test from "node:test";
import { decimalToCents } from "./money.mjs";

test("converts arbitrary PostgreSQL numeric scale with exact cent rounding", () => {
  assert.equal(decimalToCents("149.000000000000000000000000000000"), 14900);
  assert.equal(decimalToCents("1.005000000000000000000000000000"), 101);
  assert.equal(decimalToCents("-1.005000000000000000000000000000"), -101);
  assert.equal(decimalToCents("+0.0049"), 0);
});

test("rejects malformed and out-of-range V1 monetary values clearly", () => {
  assert.throws(() => decimalToCents(null, "Payment 10 amount"), /Payment 10/);
  assert.throws(() => decimalToCents("R$ 149,00"), /Invalid V1/);
  assert.throws(() => decimalToCents("21474836.48"), /V2 integer range/);
});
