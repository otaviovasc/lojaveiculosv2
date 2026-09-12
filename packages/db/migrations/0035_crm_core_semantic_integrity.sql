-- Reflect 0032 runtime columns in the canonical schema without recreating its tables.
ALTER TABLE "crm_external_bot_event_outbox" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_external_bot_kill_switches" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_external_bot_proposals" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" ADD CONSTRAINT "crm_external_bot_event_outbox_revision_nonnegative" CHECK ("revision" >= 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_external_bot_kill_switches" ADD CONSTRAINT "crm_external_bot_kill_switches_revision_nonnegative" CHECK ("revision" >= 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_external_bot_proposals" ADD CONSTRAINT "crm_external_bot_proposals_revision_nonnegative" CHECK ("revision" >= 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" VALIDATE CONSTRAINT "crm_external_bot_event_outbox_revision_nonnegative";--> statement-breakpoint
ALTER TABLE "crm_external_bot_kill_switches" VALIDATE CONSTRAINT "crm_external_bot_kill_switches_revision_nonnegative";--> statement-breakpoint
ALTER TABLE "crm_external_bot_proposals" VALIDATE CONSTRAINT "crm_external_bot_proposals_revision_nonnegative";--> statement-breakpoint

-- Parent keys include the semantic discriminators used by their children.
CREATE UNIQUE INDEX "external_account_authorizations_semantic_id_unique" ON "external_account_authorizations" ("tenant_id","store_id","id","provider","broker");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connections_provider_id_unique" ON "provider_connections" ("tenant_id","store_id","id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connections_channel_id_unique" ON "provider_connections" ("tenant_id","store_id","id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_threads_connection_id_unique" ON "conversation_threads" ("tenant_id","store_id","id","provider_connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_cycles_thread_id_unique" ON "conversation_cycles" ("tenant_id","store_id","id","thread_id");--> statement-breakpoint

ALTER TABLE "provider_connections" DROP CONSTRAINT "provider_connections_scoped_authorization_fk";--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_semantic_authorization_fk"
  FOREIGN KEY ("tenant_id","store_id","authorization_id","provider","broker")
  REFERENCES "external_account_authorizations"("tenant_id","store_id","id","provider","broker") NOT VALID;--> statement-breakpoint
ALTER TABLE "provider_connections" VALIDATE CONSTRAINT "provider_connections_semantic_authorization_fk";--> statement-breakpoint

ALTER TABLE "conversation_threads" DROP CONSTRAINT "conversation_threads_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_semantic_connection_fk"
  FOREIGN KEY ("tenant_id","store_id","provider_connection_id","channel")
  REFERENCES "provider_connections"("tenant_id","store_id","id","channel") NOT VALID;--> statement-breakpoint
ALTER TABLE "conversation_threads" VALIDATE CONSTRAINT "conversation_threads_semantic_connection_fk";--> statement-breakpoint

ALTER TABLE "canonical_messages" DROP CONSTRAINT "canonical_messages_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "canonical_messages" DROP CONSTRAINT "canonical_messages_scoped_thread_fk";--> statement-breakpoint
ALTER TABLE "canonical_messages" DROP CONSTRAINT "canonical_messages_scoped_cycle_fk";--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_semantic_connection_fk"
  FOREIGN KEY ("tenant_id","store_id","provider_connection_id","provider")
  REFERENCES "provider_connections"("tenant_id","store_id","id","provider") NOT VALID;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_semantic_thread_fk"
  FOREIGN KEY ("tenant_id","store_id","thread_id","provider_connection_id")
  REFERENCES "conversation_threads"("tenant_id","store_id","id","provider_connection_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_semantic_cycle_fk"
  FOREIGN KEY ("tenant_id","store_id","cycle_id","thread_id")
  REFERENCES "conversation_cycles"("tenant_id","store_id","id","thread_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "canonical_messages" VALIDATE CONSTRAINT "canonical_messages_semantic_connection_fk";--> statement-breakpoint
ALTER TABLE "canonical_messages" VALIDATE CONSTRAINT "canonical_messages_semantic_thread_fk";--> statement-breakpoint
ALTER TABLE "canonical_messages" VALIDATE CONSTRAINT "canonical_messages_semantic_cycle_fk";--> statement-breakpoint

ALTER TABLE "conversation_attendances" DROP CONSTRAINT "conversation_attendances_scoped_cycle_fk";--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_semantic_cycle_fk"
  FOREIGN KEY ("tenant_id","store_id","cycle_id","thread_id")
  REFERENCES "conversation_cycles"("tenant_id","store_id","id","thread_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "conversation_attendances" VALIDATE CONSTRAINT "conversation_attendances_semantic_cycle_fk";--> statement-breakpoint

-- Bot grants and effects must carry the exact provider graph they authorize.
ALTER TABLE "bot_integration_grants" ADD COLUMN IF NOT EXISTS "provider" "transport_provider";--> statement-breakpoint
UPDATE "bot_integration_grants" grant_row
SET "provider" = connection."provider"
FROM "provider_connections" connection
WHERE connection."tenant_id" = grant_row."tenant_id"
  AND connection."store_id" = grant_row."store_id"
  AND connection."id" = grant_row."provider_connection_id"
  AND grant_row."provider" IS NULL;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ALTER COLUMN "provider" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bot_integration_grants_command_scope_unique" ON "bot_integration_grants"
  ("tenant_id","store_id","id","provider_connection_id","thread_id","provider","action_type","action_class");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_action_commands_effect_scope_unique" ON "bot_action_commands"
  ("tenant_id","store_id","id","provider_connection_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_action_commands_proposal_scope_unique" ON "bot_action_commands"
  ("tenant_id","store_id","id","action_type");--> statement-breakpoint

ALTER TABLE "bot_integration_grants" DROP CONSTRAINT "bot_integration_grants_scoped_connection_fk";--> statement-breakpoint
ALTER TABLE "bot_integration_grants" DROP CONSTRAINT "bot_integration_grants_scoped_thread_fk";--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_semantic_connection_fk"
  FOREIGN KEY ("tenant_id","store_id","provider_connection_id","provider")
  REFERENCES "provider_connections"("tenant_id","store_id","id","provider") NOT VALID;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_semantic_thread_fk"
  FOREIGN KEY ("tenant_id","store_id","thread_id","provider_connection_id")
  REFERENCES "conversation_threads"("tenant_id","store_id","id","provider_connection_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" VALIDATE CONSTRAINT "bot_integration_grants_semantic_connection_fk";--> statement-breakpoint
ALTER TABLE "bot_integration_grants" VALIDATE CONSTRAINT "bot_integration_grants_semantic_thread_fk";--> statement-breakpoint

ALTER TABLE "bot_action_commands" DROP CONSTRAINT "bot_action_commands_scoped_grant_fk";--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_semantic_grant_fk"
  FOREIGN KEY ("tenant_id","store_id","grant_id","provider_connection_id","thread_id","provider","action_type","authorization_class")
  REFERENCES "bot_integration_grants"("tenant_id","store_id","id","provider_connection_id","thread_id","provider","action_type","action_class") NOT VALID;--> statement-breakpoint
ALTER TABLE "bot_action_commands" VALIDATE CONSTRAINT "bot_action_commands_semantic_grant_fk";--> statement-breakpoint

ALTER TABLE "provider_effects" ALTER COLUMN "command_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_effects" DROP CONSTRAINT "provider_effects_scoped_command_fk";--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_semantic_command_fk"
  FOREIGN KEY ("tenant_id","store_id","command_id","provider_connection_id","provider")
  REFERENCES "bot_action_commands"("tenant_id","store_id","id","provider_connection_id","provider") NOT VALID;--> statement-breakpoint
ALTER TABLE "provider_effects" VALIDATE CONSTRAINT "provider_effects_semantic_command_fk";--> statement-breakpoint

ALTER TABLE "crm_external_bot_event_outbox" DROP CONSTRAINT "crm_external_bot_event_outbox_thread_fk";--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" ADD CONSTRAINT "crm_external_bot_event_outbox_semantic_thread_fk"
  FOREIGN KEY ("tenant_id","store_id","thread_id","provider_connection_id")
  REFERENCES "conversation_threads"("tenant_id","store_id","id","provider_connection_id") NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" VALIDATE CONSTRAINT "crm_external_bot_event_outbox_semantic_thread_fk";--> statement-breakpoint

ALTER TABLE "crm_external_bot_proposals" DROP CONSTRAINT "crm_external_bot_proposals_command_fk";--> statement-breakpoint
ALTER TABLE "crm_external_bot_proposals" ADD CONSTRAINT "crm_external_bot_proposals_semantic_command_fk"
  FOREIGN KEY ("tenant_id","store_id","command_id","action_type")
  REFERENCES "bot_action_commands"("tenant_id","store_id","id","action_type") NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_external_bot_proposals" VALIDATE CONSTRAINT "crm_external_bot_proposals_semantic_command_fk";--> statement-breakpoint

-- Store assignments require an active membership in the exact tenant/store.
CREATE FUNCTION "crm_core_require_active_assignee"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  assignee uuid;
BEGIN
  assignee := nullif(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid;
  IF assignee IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "store_memberships" membership
    WHERE membership."tenant_id" = NEW."tenant_id"
      AND membership."store_id" = NEW."store_id"
      AND membership."user_id" = assignee
      AND membership."status" = 'active'
  ) THEN
    RAISE EXCEPTION 'CRM assignee must have an active membership in the exact tenant/store';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT "tenant_id", "store_id", "assigned_user_id" AS user_id FROM "opportunities"
      UNION ALL SELECT "tenant_id", "store_id", "assigned_user_id" FROM "conversation_cycles"
      UNION ALL SELECT "tenant_id", "store_id", "assigned_user_id" FROM "conversation_attendances"
      UNION ALL SELECT "tenant_id", "store_id", "granted_by_user_id" FROM "bot_integration_grants"
      UNION ALL SELECT "tenant_id", "store_id", "approved_by_user_id" FROM "bot_action_commands"
    ) assignment
    WHERE assignment.user_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "store_memberships" membership
      WHERE membership."tenant_id" = assignment."tenant_id"
        AND membership."store_id" = assignment."store_id"
        AND membership."user_id" = assignment.user_id
        AND membership."status" = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'CRM semantic integrity blocked: cross-tenant/store or inactive assignee';
  END IF;
END
$$;--> statement-breakpoint

CREATE TRIGGER "opportunities_active_assignee" BEFORE INSERT OR UPDATE OF "tenant_id","store_id","assigned_user_id" ON "opportunities"
FOR EACH ROW EXECUTE FUNCTION "crm_core_require_active_assignee"('assigned_user_id');--> statement-breakpoint
CREATE TRIGGER "conversation_cycles_active_assignee" BEFORE INSERT OR UPDATE OF "tenant_id","store_id","assigned_user_id" ON "conversation_cycles"
FOR EACH ROW EXECUTE FUNCTION "crm_core_require_active_assignee"('assigned_user_id');--> statement-breakpoint
CREATE TRIGGER "conversation_attendances_active_assignee" BEFORE INSERT OR UPDATE OF "tenant_id","store_id","assigned_user_id" ON "conversation_attendances"
FOR EACH ROW EXECUTE FUNCTION "crm_core_require_active_assignee"('assigned_user_id');--> statement-breakpoint
CREATE TRIGGER "bot_integration_grants_active_granter" BEFORE INSERT OR UPDATE OF "tenant_id","store_id","granted_by_user_id" ON "bot_integration_grants"
FOR EACH ROW EXECUTE FUNCTION "crm_core_require_active_assignee"('granted_by_user_id');--> statement-breakpoint
CREATE TRIGGER "bot_action_commands_active_approver" BEFORE INSERT OR UPDATE OF "tenant_id","store_id","approved_by_user_id" ON "bot_action_commands"
FOR EACH ROW EXECUTE FUNCTION "crm_core_require_active_assignee"('approved_by_user_id');--> statement-breakpoint

-- Vehicle references must resolve to the same scope, and a unit must belong to the selected listing.
CREATE FUNCTION "crm_core_require_scoped_vehicle_interest"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "vehicle_listings" listing
    WHERE listing."id" = NEW."listing_id" AND listing."tenant_id" = NEW."tenant_id" AND listing."store_id" = NEW."store_id"
  ) THEN
    RAISE EXCEPTION 'CRM vehicle interest listing is outside tenant/store scope';
  END IF;
  IF NEW."unit_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "vehicle_units" unit
    WHERE unit."id" = NEW."unit_id" AND unit."tenant_id" = NEW."tenant_id" AND unit."store_id" = NEW."store_id"
      AND unit."listing_id" = NEW."listing_id"
  ) THEN
    RAISE EXCEPTION 'CRM vehicle interest unit is outside scope or belongs to another listing';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "vehicle_interests" interest
    LEFT JOIN "vehicle_listings" listing ON listing."id" = interest."listing_id"
      AND listing."tenant_id" = interest."tenant_id" AND listing."store_id" = interest."store_id"
    LEFT JOIN "vehicle_units" unit ON unit."id" = interest."unit_id"
      AND unit."tenant_id" = interest."tenant_id" AND unit."store_id" = interest."store_id"
      AND unit."listing_id" = interest."listing_id"
    WHERE listing."id" IS NULL OR (interest."unit_id" IS NOT NULL AND unit."id" IS NULL)
  ) THEN
    RAISE EXCEPTION 'CRM semantic integrity blocked: invalid vehicle interest scope or listing/unit relation';
  END IF;
END
$$;--> statement-breakpoint

CREATE TRIGGER "vehicle_interests_scoped_vehicle" BEFORE INSERT OR UPDATE OF "tenant_id","store_id","listing_id","unit_id" ON "vehicle_interests"
FOR EACH ROW EXECUTE FUNCTION "crm_core_require_scoped_vehicle_interest"();
