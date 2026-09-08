ALTER TABLE "crm_campaigns"
  DROP CONSTRAINT IF EXISTS "crm_campaigns_initial_tag_id_crm_tags_id_fk",
  DROP CONSTRAINT IF EXISTS "crm_campaigns_reply_tag_id_crm_tags_id_fk";

ALTER TABLE "crm_campaigns"
  DROP COLUMN IF EXISTS "initial_tag_id",
  DROP COLUMN IF EXISTS "reply_tag_id";

ALTER TABLE "crm_campaigns"
  ADD COLUMN IF NOT EXISTS "initial_stage_id" uuid,
  ADD COLUMN IF NOT EXISTS "reply_stage_id" uuid;

ALTER TABLE "crm_campaigns"
  ADD CONSTRAINT "crm_campaigns_initial_stage_id_crm_pipeline_stages_id_fk"
  FOREIGN KEY ("initial_stage_id") REFERENCES "crm_pipeline_stages"("id");

ALTER TABLE "crm_campaigns"
  ADD CONSTRAINT "crm_campaigns_reply_stage_id_crm_pipeline_stages_id_fk"
  FOREIGN KEY ("reply_stage_id") REFERENCES "crm_pipeline_stages"("id");

DROP TABLE IF EXISTS "crm_conversation_thread_tags";

DROP TABLE IF EXISTS "crm_tags";
