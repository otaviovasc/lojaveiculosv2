import assert from "node:assert/strict";
import test from "node:test";
import { migrationErrorSummary } from "./log.mjs";

test("migration error summaries expose diagnostics without credentials or email", () => {
  const summary = migrationErrorSummary({
    code: "23503",
    constraint_name: "messages_session_fk",
    message:
      "failed for postgresql://user:password@host/db and owner@example.com",
    table_name: "crm_whatsapp_messages",
  });

  assert.match(summary, /code=23503/);
  assert.match(summary, /table=crm_whatsapp_messages/);
  assert.match(summary, /constraint=messages_session_fk/);
  assert.doesNotMatch(summary, /user:password/);
  assert.doesNotMatch(summary, /owner@example/);
});
