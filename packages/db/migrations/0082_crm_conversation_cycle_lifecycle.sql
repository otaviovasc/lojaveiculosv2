ALTER TABLE "crm_conversation_cycles"
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "pinned_at" timestamp with time zone;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "conversation_cycles_store_pinned_idx"
  ON "crm_conversation_cycles" ("store_id", "pinned_at" DESC NULLS LAST);
