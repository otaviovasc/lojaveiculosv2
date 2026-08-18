import assert from "node:assert/strict";
import test from "node:test";
import {
  replaceStoreWhatsappHistory,
  WHATSAPP_HISTORY_TABLES,
} from "./target-crm-whatsapp-replace.mjs";

test("deletes canonical conversation dependents before core rows", () => {
  assert.deepEqual(WHATSAPP_HISTORY_TABLES, [
    "crm_webhook_effect_outbox",
    "crm_external_bot_event_outbox",
    "crm_whatsapp_outbound_intents",
    "crm_whatsapp_scheduled_messages",
    "crm_whatsapp_campaign_recipients",
    "crm_whatsapp_campaigns",
    "crm_conversation_thread_tags",
    "crm_conversation_command_receipts",
    "crm_conversation_attendance_events",
    "crm_messages",
    "crm_conversation_attendances",
    "crm_conversation_cycles",
    "crm_conversation_threads",
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

  assert.equal(calls.length, WHATSAPP_HISTORY_TABLES.length + 2);
  assert.ok(calls.every((call) => call.parameters[0] === "store-id"));
  assert.match(calls[0].query, /UPDATE crm_lead_outcomes/);
  assert.ok(
    calls
      .slice(1, -1)
      .filter((call) => call.query.includes("thread_id"))
      .every((call) => call.query.includes("channel='whatsapp'")),
  );
  assert.match(calls.at(-1).query, /generatedForWhatsappCoverage/);
});
