import assert from "node:assert/strict";
import test from "node:test";
import { createStages } from "./target-execution.mjs";

test("applied migration reconciles stale rows first and defers WhatsApp", () => {
  const stages = createStages({
    config: {},
    data: {},
    ids: {},
    modules: new Set([
      "attachments",
      "documents",
      "leads",
      "sales",
      "vehicles",
      "whatsapp",
    ]),
    uploader: null,
  });

  assert.deepEqual(
    stages.map((stage) => stage.key),
    [
      "reconciliation",
      "foundation",
      "fiscal",
      "inventory",
      "crm",
      "sales",
      "documents",
      "attachments",
      "whatsapp",
    ],
  );
});
