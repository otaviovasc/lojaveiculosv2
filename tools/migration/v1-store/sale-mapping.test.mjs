import assert from "node:assert/strict";
import test from "node:test";
import { documentKindsForSale } from "./sale-mapping.mjs";

test("maps V1 receiving terms to the V2 buyer acknowledgment", () => {
  const kinds = documentKindsForSale(
    [
      { saleId: 35, type: "RECEIVING_TERM" },
      { saleId: 35, type: "DELIVERY_TERM" },
    ],
    35,
  );

  assert.deepEqual(kinds, ["buyer_acknowledgment", "delivery_term"]);
});
