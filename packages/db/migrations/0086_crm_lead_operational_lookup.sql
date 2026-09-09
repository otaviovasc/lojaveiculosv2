CREATE INDEX IF NOT EXISTS "conversation_cycles_scoped_lead_idx"
  ON "crm_conversation_cycles" ("tenant_id", "store_id", ("metadata"->>'leadId'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_cycles_scoped_opportunity_idx"
  ON "crm_conversation_cycles" ("tenant_id", "store_id", "opportunity_id");
