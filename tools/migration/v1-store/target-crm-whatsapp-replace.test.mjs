import assert from "node:assert/strict";
import test from "node:test";
import {
  replaceStoreWhatsappHistory,
  WHATSAPP_HISTORY_TABLES,
} from "./target-crm-whatsapp-replace.mjs";

test("deletes session dependents before WhatsApp messages and sessions", () => {
  assert.deepEqual(WHATSAPP_HISTORY_TABLES, [
    "crm_whatsapp_scheduled_messages",
    "crm_whatsapp_campaign_recipients",
    "crm_whatsapp_campaigns",
    "crm_whatsapp_session_tags",
    "crm_whatsapp_messages",
    "crm_whatsapp_sessions",
  ]);
});

test("replacement is store-scoped and removes generated coverage leads", async () => {
  const calls = [];
  await replaceStoreWhatsappHistory(
    {
      unsafe(query, parameters) {
        calls.push({ parameters, query });
        return [];
      },
    },
    "store-id",
  );

  assert.equal(calls.length, WHATSAPP_HISTORY_TABLES.length + 1);
  assert.ok(calls.every((call) => call.parameters[0] === "store-id"));
  assert.match(calls.at(-1).query, /generatedForWhatsappCoverage/);
});
