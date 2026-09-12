ALTER TYPE "crm_external_bot_action_command_state" ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'accepted';--> statement-breakpoint

ALTER TABLE "crm_external_bot_action_commands"
  ADD COLUMN "expected_attendance_revision" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_external_bot_action_commands"
  ADD CONSTRAINT "crm_external_bot_action_commands_expected_attendance_revision_nonnegative"
  CHECK ("expected_attendance_revision" >= 0);--> statement-breakpoint

ALTER TABLE "crm_external_bot_proposals"
  ADD COLUMN "decision_state" varchar(16) NOT NULL DEFAULT 'pending',
  ADD COLUMN "decided_at" timestamp with time zone,
  ADD COLUMN "decided_by_user_id" uuid REFERENCES "users"("id"),
  ADD COLUMN "decision_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "crm_external_bot_proposals"
  ADD CONSTRAINT "crm_external_bot_proposals_decision_state_check"
  CHECK ("decision_state" IN ('pending','approved','rejected')),
  ADD CONSTRAINT "crm_external_bot_proposals_decision_actor_check"
  CHECK (("decision_state" = 'pending' AND "decided_at" IS NULL AND "decided_by_user_id" IS NULL)
    OR ("decision_state" IN ('approved','rejected') AND "decided_at" IS NOT NULL AND "decided_by_user_id" IS NOT NULL));--> statement-breakpoint

ALTER TABLE "crm_external_bot_provider_effects"
  ADD COLUMN "provider_attempted_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "crm_external_bot_action_commands"
  DROP CONSTRAINT "crm_external_bot_action_commands_semantic_grant_fk";--> statement-breakpoint
CREATE UNIQUE INDEX "crm_external_bot_grants_approval_scope_unique"
  ON "crm_external_bot_grants" ("tenant_id","store_id","id","provider_connection_id","thread_id","provider","action_type");--> statement-breakpoint
ALTER TABLE "crm_external_bot_action_commands"
  ADD CONSTRAINT "crm_external_bot_action_commands_semantic_grant_fk"
  FOREIGN KEY ("tenant_id","store_id","grant_id","provider_connection_id","thread_id","provider","action_type")
  REFERENCES "crm_external_bot_grants"("tenant_id","store_id","id","provider_connection_id","thread_id","provider","action_type");--> statement-breakpoint

CREATE OR REPLACE FUNCTION "crm_core_reject_human_bot_effect"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "crm_external_bot_action_commands" command
    WHERE command."id" = NEW."command_id"
      AND (
        command."authorization_class" = 'automatic'
        OR (
          command."authorization_class" = 'human_approved'
          AND command."approved_at" IS NOT NULL
          AND command."approved_by_user_id" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM "crm_external_bot_proposals" proposal
            WHERE proposal."command_id" = command."id"
              AND proposal."tenant_id" = command."tenant_id"
              AND proposal."store_id" = command."store_id"
              AND proposal."decision_state" = 'approved'
          )
        )
      )
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'External bot provider effect lacks automatic or approved proposal authorization';
END;
$$;--> statement-breakpoint
