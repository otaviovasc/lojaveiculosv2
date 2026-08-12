CREATE TYPE "public"."acquisition_source" AS ENUM('olx', 'meta_ad', 'mobiauto', 'site', 'manual');--> statement-breakpoint
CREATE TYPE "public"."external_authorization_state" AS ENUM('pending', 'authorized', 'restricted', 'revoked', 'error');--> statement-breakpoint
CREATE TYPE "public"."bot_action_command_state" AS ENUM('accepted', 'authorized', 'claimed', 'executing', 'provider_succeeded', 'completed', 'retryable_failed', 'indeterminate', 'dead_letter', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bot_authorization_class" AS ENUM('automatic', 'proposal_only', 'human_approved');--> statement-breakpoint
CREATE TYPE "public"."bot_integration_grant_state" AS ENUM('issued', 'consumed', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."canonical_message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."canonical_message_sender" AS ENUM('customer', 'human', 'bot', 'system', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."canonical_message_status" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."capability_grant_state" AS ENUM('pending', 'granted', 'partial', 'denied', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."consent_receipt_state" AS ENUM('granted', 'withdrawn', 'expired', 'denied');--> statement-breakpoint
CREATE TYPE "public"."contact_identity_kind" AS ENUM('phone', 'email', 'provider_subject', 'chat_lid');--> statement-breakpoint
CREATE TYPE "public"."contact_identity_state" AS ENUM('observed', 'candidate', 'verified', 'disputed', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."conversation_attendance_state" AS ENUM('bot_active', 'handoff_requested', 'human_claimed', 'human_active', 'handback_pending');--> statement-breakpoint
CREATE TYPE "public"."conversation_cycle_state" AS ENUM('active', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."conversation_thread_state" AS ENUM('open', 'resolved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."credential_broker" AS ENUM('composio', 'direct');--> statement-breakpoint
CREATE TYPE "public"."crm_core_migration_finding_kind" AS ENUM('orphan', 'collision', 'ambiguous_identity', 'message_without_thread', 'cross_store', 'provider_divergence', 'summary');--> statement-breakpoint
CREATE TYPE "public"."fact_proposal_state" AS ENUM('pending', 'approved', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."integration_capability" AS ENUM('messaging', 'lead_ingestion', 'inventory_sync');--> statement-breakpoint
CREATE TYPE "public"."integration_event_state" AS ENUM('received', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."messaging_channel" AS ENUM('whatsapp', 'instagram', 'olx_chat');--> statement-breakpoint
CREATE TYPE "public"."opportunity_state" AS ENUM('open', 'won', 'lost', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."provider_connection_state" AS ENUM('sandbox', 'active', 'paused', 'disconnected', 'error', 'archived');--> statement-breakpoint
CREATE TYPE "public"."provider_effect_state" AS ENUM('accepted', 'authorized', 'claimed', 'executing', 'provider_succeeded', 'completed', 'retryable_failed', 'indeterminate', 'dead_letter', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."scope_grant_state" AS ENUM('pending', 'granted', 'partial', 'denied', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."transport_provider" AS ENUM('meta_cloud', 'zapi', 'olx');--> statement-breakpoint
CREATE TYPE "public"."workflow_provider" AS ENUM('credere');--> statement-breakpoint
CREATE TABLE "external_account_authorization_capabilities" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"authorization_id" uuid NOT NULL,
	"capability" "integration_capability" NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "capability_grant_state" DEFAULT 'pending' NOT NULL,
	"state_reason" varchar(191),
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "external_authorization_capabilities_revision_nonnegative" CHECK ("external_account_authorization_capabilities"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "external_account_authorizations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"authorization_state" "external_authorization_state" DEFAULT 'pending' NOT NULL,
	"broker" "credential_broker" NOT NULL,
	"external_account_id" varchar(191),
	"granted_scopes" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" "transport_provider" NOT NULL,
	"requested_scopes" text[] DEFAULT '{}' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"scope_state" "scope_grant_state" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "external_account_authorizations_revision_nonnegative" CHECK ("external_account_authorizations"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "provider_connections" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"authorization_id" uuid,
	"broker" "credential_broker" NOT NULL,
	"channel" "messaging_channel" NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"external_connection_id" varchar(191),
	"external_instance_id" varchar(191),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" "transport_provider" NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "provider_connection_state" DEFAULT 'sandbox' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"webhook_url" varchar(500),
	CONSTRAINT "provider_connections_revision_nonnegative" CHECK ("provider_connections"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contact_identities" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "messaging_channel",
	"contact_id" uuid,
	"identity_kind" "contact_identity_kind" NOT NULL,
	"normalized_value" varchar(320) NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" "transport_provider",
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "contact_identity_state" DEFAULT 'observed' NOT NULL,
	"superseded_by_identity_id" uuid,
	"verified_at" timestamp with time zone,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "contact_identities_verified_at_check" CHECK ("contact_identities"."state" <> 'verified' OR "contact_identities"."verified_at" IS NOT NULL),
	CONSTRAINT "contact_identities_superseded_check" CHECK (("contact_identities"."state" = 'superseded') = ("contact_identities"."superseded_by_identity_id" IS NOT NULL)),
	CONSTRAINT "contact_identities_revision_nonnegative" CHECK ("contact_identities"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"display_name" varchar(191),
	"primary_email" varchar(254),
	"primary_phone" varchar(40),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"merged_into_contact_id" uuid,
	"revision" integer DEFAULT 0 NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "contacts_not_merged_into_self" CHECK ("contacts"."merged_into_contact_id" IS NULL OR "contacts"."merged_into_contact_id" <> "contacts"."id"),
	CONSTRAINT "contacts_revision_nonnegative" CHECK ("contacts"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"assigned_user_id" uuid,
	"contact_id" uuid NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"legacy_lead_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"source" "acquisition_source" NOT NULL,
	"stage_key" varchar(120) DEFAULT 'new' NOT NULL,
	"state" "opportunity_state" DEFAULT 'open' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "opportunities_revision_nonnegative" CHECK ("opportunities"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vehicle_interests" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"unit_id" uuid,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "vehicle_interests_revision_nonnegative" CHECK ("vehicle_interests"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "canonical_messages" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"cycle_id" uuid NOT NULL,
	"direction" "canonical_message_direction" NOT NULL,
	"media_type" varchar(120),
	"media_url" text,
	"message_type" varchar(40) DEFAULT 'text' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" "transport_provider" NOT NULL,
	"provider_connection_id" uuid NOT NULL,
	"provider_message_id" varchar(191),
	"revision" integer DEFAULT 0 NOT NULL,
	"sender" "canonical_message_sender" DEFAULT 'unknown' NOT NULL,
	"status" "canonical_message_status" DEFAULT 'pending' NOT NULL,
	"thread_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "canonical_messages_revision_nonnegative" CHECK ("canonical_messages"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "conversation_attendances" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_user_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "conversation_attendance_state" DEFAULT 'bot_active' NOT NULL,
	"thread_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "conversation_attendances_revision_nonnegative" CHECK ("conversation_attendances"."revision" >= 0),
	CONSTRAINT "conversation_attendances_human_actor_check" CHECK ("conversation_attendances"."state" NOT IN ('human_claimed', 'human_active') OR "conversation_attendances"."assigned_user_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "conversation_cycles" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_user_id" uuid,
	"closed_at" timestamp with time zone,
	"external_cycle_id" varchar(191),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opportunity_id" uuid,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "conversation_cycle_state" DEFAULT 'active' NOT NULL,
	"thread_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "conversation_cycles_revision_nonnegative" CHECK ("conversation_cycles"."revision" >= 0),
	CONSTRAINT "conversation_cycles_closed_state_check" CHECK ("conversation_cycles"."closed_at" IS NULL OR "conversation_cycles"."state" IN ('completed', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "conversation_threads" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "messaging_channel" NOT NULL,
	"contact_id" uuid,
	"external_thread_id" varchar(191),
	"last_message_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_connection_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "conversation_thread_state" DEFAULT 'open' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "conversation_threads_revision_nonnegative" CHECK ("conversation_threads"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bot_action_commands" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action_type" varchar(120) NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"expected_revision" integer NOT NULL,
	"grant_id" uuid NOT NULL,
	"idempotency_key" varchar(191) NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" "transport_provider" NOT NULL,
	"provider_connection_id" uuid NOT NULL,
	"request_digest" varchar(128) NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"authorization_class" "bot_authorization_class" NOT NULL,
	"state" "bot_action_command_state" DEFAULT 'accepted' NOT NULL,
	"thread_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "bot_action_commands_expected_revision_nonnegative" CHECK ("bot_action_commands"."expected_revision" >= 0),
	CONSTRAINT "bot_action_commands_request_digest_nonempty" CHECK (btrim("bot_action_commands"."request_digest") <> ''),
	CONSTRAINT "bot_action_commands_approval_check" CHECK (("bot_action_commands"."authorization_class" IN ('automatic', 'proposal_only') AND "bot_action_commands"."approved_at" IS NULL AND "bot_action_commands"."approved_by_user_id" IS NULL) OR ("bot_action_commands"."authorization_class" = 'human_approved' AND "bot_action_commands"."approved_at" IS NOT NULL AND "bot_action_commands"."approved_by_user_id" IS NOT NULL)),
	CONSTRAINT "bot_action_commands_revision_nonnegative" CHECK ("bot_action_commands"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bot_integration_grants" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action_class" "bot_authorization_class" NOT NULL,
	"action_type" varchar(120) NOT NULL,
	"bot_key" varchar(120) NOT NULL,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"granted_by_user_id" uuid,
	"integration_id" uuid NOT NULL,
	"model_version" varchar(120) NOT NULL,
	"provider_connection_id" uuid NOT NULL,
	"request_digest" varchar(128) NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "bot_integration_grant_state" DEFAULT 'issued' NOT NULL,
	"thread_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_provider" "workflow_provider" NOT NULL,
	CONSTRAINT "bot_integration_grants_expiry_check" CHECK ("bot_integration_grants"."expires_at" > "bot_integration_grants"."created_at"),
	CONSTRAINT "bot_integration_grants_consumption_check" CHECK (("bot_integration_grants"."state" = 'consumed') = ("bot_integration_grants"."consumed_at" IS NOT NULL)),
	CONSTRAINT "bot_integration_grants_revision_nonnegative" CHECK ("bot_integration_grants"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "crm_core_migration_findings" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"finding_key" varchar(191) NOT NULL,
	"finding_kind" "crm_core_migration_finding_kind" NOT NULL,
	"resolved_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	"source_id" varchar(191),
	"source_table" varchar(120) NOT NULL,
	"store_id" uuid,
	"tenant_id" uuid,
	CONSTRAINT "crm_core_migration_findings_scope_check" CHECK (("crm_core_migration_findings"."store_id" IS NULL AND "crm_core_migration_findings"."tenant_id" IS NULL) OR ("crm_core_migration_findings"."store_id" IS NOT NULL AND "crm_core_migration_findings"."tenant_id" IS NOT NULL)),
	CONSTRAINT "crm_core_migration_findings_revision_nonnegative" CHECK ("crm_core_migration_findings"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_code" varchar(120),
	"event_type" varchar(120) NOT NULL,
	"idempotency_key" varchar(191) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" "transport_provider" NOT NULL,
	"provider_connection_id" uuid,
	"provider_event_id" varchar(191),
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "integration_event_state" DEFAULT 'received' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "integration_events_revision_nonnegative" CHECK ("integration_events"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "provider_effects" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"command_id" uuid,
	"effect_type" varchar(120) NOT NULL,
	"external_effect_id" varchar(191),
	"idempotency_key" varchar(191) NOT NULL,
	"last_error_code" varchar(120),
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" "transport_provider" NOT NULL,
	"provider_connection_id" uuid NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "provider_effect_state" DEFAULT 'accepted' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "provider_effects_attempt_count_nonnegative" CHECK ("provider_effects"."attempt_count" >= 0),
	CONSTRAINT "provider_effects_revision_nonnegative" CHECK ("provider_effects"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "acquisition_touchpoints" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_id" uuid NOT NULL,
	"external_reference" varchar(191),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"provider_connection_id" uuid,
	"revision" integer DEFAULT 0 NOT NULL,
	"source" "acquisition_source" NOT NULL,
	"thread_id" uuid,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "acquisition_touchpoints_revision_nonnegative" CHECK ("acquisition_touchpoints"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "consent_receipts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "messaging_channel",
	"contact_id" uuid NOT NULL,
	"evidence_reference" varchar(191) NOT NULL,
	"legal_basis" varchar(80) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purpose" varchar(120) NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "consent_receipt_state" NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "consent_receipts_revision_nonnegative" CHECK ("consent_receipts"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fact_proposals" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_id" uuid NOT NULL,
	"fact_key" varchar(120) NOT NULL,
	"observed_fact_id" uuid NOT NULL,
	"proposed_value" jsonb NOT NULL,
	"review_reason" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" uuid,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" "fact_proposal_state" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "fact_proposals_review_state_check" CHECK (("fact_proposals"."state" = 'pending' AND "fact_proposals"."reviewed_at" IS NULL AND "fact_proposals"."reviewed_by_user_id" IS NULL) OR ("fact_proposals"."state" <> 'pending' AND "fact_proposals"."reviewed_at" IS NOT NULL AND "fact_proposals"."review_reason" IS NOT NULL)),
	CONSTRAINT "fact_proposals_revision_nonnegative" CHECK ("fact_proposals"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "observed_facts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"contact_id" uuid NOT NULL,
	"fact_key" varchar(120) NOT NULL,
	"fact_value" jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"source_message_id" uuid,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "observed_facts_confidence_range" CHECK ("observed_facts"."confidence" >= 0 AND "observed_facts"."confidence" <= 1),
	CONSTRAINT "observed_facts_revision_nonnegative" CHECK ("observed_facts"."revision" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "external_account_authorizations_scope_id_unique" ON "external_account_authorizations" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connections_scope_id_unique" ON "provider_connections" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_identities_scope_id_unique" ON "contact_identities" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_scope_id_unique" ON "contacts" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_scope_id_unique" ON "opportunities" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_messages_scope_id_unique" ON "canonical_messages" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_cycles_scope_id_unique" ON "conversation_cycles" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_threads_scope_id_unique" ON "conversation_threads" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_action_commands_scope_id_unique" ON "bot_action_commands" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_integration_grants_scope_id_unique" ON "bot_integration_grants" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "observed_facts_scope_id_unique" ON "observed_facts" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
ALTER TABLE "external_account_authorization_capabilities" ADD CONSTRAINT "external_account_authorization_capabilities_authorization_id_external_account_authorizations_id_fk" FOREIGN KEY ("authorization_id") REFERENCES "public"."external_account_authorizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_account_authorization_capabilities" ADD CONSTRAINT "external_account_authorization_capabilities_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_account_authorization_capabilities" ADD CONSTRAINT "external_account_authorization_capabilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_account_authorization_capabilities" ADD CONSTRAINT "external_authorization_capabilities_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_account_authorization_capabilities" ADD CONSTRAINT "external_authorization_capabilities_scoped_authorization_fk" FOREIGN KEY ("tenant_id","store_id","authorization_id") REFERENCES "public"."external_account_authorizations"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_account_authorizations" ADD CONSTRAINT "external_account_authorizations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_account_authorizations" ADD CONSTRAINT "external_account_authorizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_account_authorizations" ADD CONSTRAINT "external_account_authorizations_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_scoped_authorization_fk" FOREIGN KEY ("tenant_id","store_id","authorization_id") REFERENCES "public"."external_account_authorizations"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_scoped_superseded_by_fk" FOREIGN KEY ("tenant_id","store_id","superseded_by_identity_id") REFERENCES "public"."contact_identities"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_scoped_merge_target_fk" FOREIGN KEY ("tenant_id","store_id","merged_into_contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_interests" ADD CONSTRAINT "vehicle_interests_scoped_opportunity_fk" FOREIGN KEY ("tenant_id","store_id","opportunity_id") REFERENCES "public"."opportunities"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_cycle_id_conversation_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."conversation_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_scoped_thread_fk" FOREIGN KEY ("tenant_id","store_id","thread_id") REFERENCES "public"."conversation_threads"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_messages" ADD CONSTRAINT "canonical_messages_scoped_cycle_fk" FOREIGN KEY ("tenant_id","store_id","cycle_id") REFERENCES "public"."conversation_cycles"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_cycle_id_conversation_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."conversation_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_scoped_thread_fk" FOREIGN KEY ("tenant_id","store_id","thread_id") REFERENCES "public"."conversation_threads"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attendances" ADD CONSTRAINT "conversation_attendances_scoped_cycle_fk" FOREIGN KEY ("tenant_id","store_id","cycle_id") REFERENCES "public"."conversation_cycles"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_scoped_thread_fk" FOREIGN KEY ("tenant_id","store_id","thread_id") REFERENCES "public"."conversation_threads"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_cycles" ADD CONSTRAINT "conversation_cycles_scoped_opportunity_fk" FOREIGN KEY ("tenant_id","store_id","opportunity_id") REFERENCES "public"."opportunities"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_grant_id_bot_integration_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."bot_integration_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_scoped_grant_fk" FOREIGN KEY ("tenant_id","store_id","grant_id") REFERENCES "public"."bot_integration_grants"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_commands" ADD CONSTRAINT "bot_action_commands_scoped_thread_fk" FOREIGN KEY ("tenant_id","store_id","thread_id") REFERENCES "public"."conversation_threads"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_integration_grants" ADD CONSTRAINT "bot_integration_grants_scoped_thread_fk" FOREIGN KEY ("tenant_id","store_id","thread_id") REFERENCES "public"."conversation_threads"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_core_migration_findings" ADD CONSTRAINT "crm_core_migration_findings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_core_migration_findings" ADD CONSTRAINT "crm_core_migration_findings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_core_migration_findings" ADD CONSTRAINT "crm_core_migration_findings_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_command_id_bot_action_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."bot_action_commands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_scoped_command_fk" FOREIGN KEY ("tenant_id","store_id","command_id") REFERENCES "public"."bot_action_commands"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_effects" ADD CONSTRAINT "provider_effects_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_provider_connection_id_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_scoped_opportunity_fk" FOREIGN KEY ("tenant_id","store_id","opportunity_id") REFERENCES "public"."opportunities"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_scoped_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_touchpoints" ADD CONSTRAINT "acquisition_touchpoints_scoped_thread_fk" FOREIGN KEY ("tenant_id","store_id","thread_id") REFERENCES "public"."conversation_threads"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_observed_fact_id_observed_facts_id_fk" FOREIGN KEY ("observed_fact_id") REFERENCES "public"."observed_facts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_proposals" ADD CONSTRAINT "fact_proposals_scoped_observed_fact_fk" FOREIGN KEY ("tenant_id","store_id","observed_fact_id") REFERENCES "public"."observed_facts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observed_facts" ADD CONSTRAINT "observed_facts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observed_facts" ADD CONSTRAINT "observed_facts_source_message_id_canonical_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."canonical_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observed_facts" ADD CONSTRAINT "observed_facts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observed_facts" ADD CONSTRAINT "observed_facts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observed_facts" ADD CONSTRAINT "observed_facts_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observed_facts" ADD CONSTRAINT "observed_facts_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observed_facts" ADD CONSTRAINT "observed_facts_scoped_message_fk" FOREIGN KEY ("tenant_id","store_id","source_message_id") REFERENCES "public"."canonical_messages"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_authorization_capabilities_scope_id_unique" ON "external_account_authorization_capabilities" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_authorization_capabilities_grant_unique" ON "external_account_authorization_capabilities" USING btree ("authorization_id","capability");--> statement-breakpoint
CREATE UNIQUE INDEX "external_account_authorizations_external_unique" ON "external_account_authorizations" USING btree ("tenant_id","store_id","provider","broker","external_account_id") WHERE "external_account_authorizations"."external_account_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connections_external_unique" ON "provider_connections" USING btree ("tenant_id","store_id","provider","external_connection_id") WHERE "provider_connections"."external_connection_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "provider_connections_store_state_idx" ON "provider_connections" USING btree ("store_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_identities_verified_value_unique" ON "contact_identities" USING btree ("tenant_id","store_id","identity_kind","normalized_value") WHERE "contact_identities"."state" = 'verified';--> statement-breakpoint
CREATE INDEX "contact_identities_contact_idx" ON "contact_identities" USING btree ("contact_id","state");--> statement-breakpoint
CREATE INDEX "contacts_store_name_idx" ON "contacts" USING btree ("store_id","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_legacy_lead_unique" ON "opportunities" USING btree ("tenant_id","store_id","legacy_lead_id");--> statement-breakpoint
CREATE INDEX "opportunities_store_state_idx" ON "opportunities" USING btree ("store_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_interests_scope_id_unique" ON "vehicle_interests" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_interests_opportunity_vehicle_unique" ON "vehicle_interests" USING btree ("opportunity_id","listing_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_messages_provider_id_unique" ON "canonical_messages" USING btree ("provider_connection_id","provider_message_id") WHERE "canonical_messages"."provider_message_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "canonical_messages_thread_occurred_idx" ON "canonical_messages" USING btree ("thread_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_attendances_scope_id_unique" ON "conversation_attendances" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_attendances_cycle_unique" ON "conversation_attendances" USING btree ("cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_cycles_thread_external_unique" ON "conversation_cycles" USING btree ("thread_id","external_cycle_id");--> statement-breakpoint
CREATE INDEX "conversation_cycles_thread_state_idx" ON "conversation_cycles" USING btree ("thread_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_threads_connection_external_unique" ON "conversation_threads" USING btree ("provider_connection_id","external_thread_id") WHERE "conversation_threads"."external_thread_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "conversation_threads_store_last_message_idx" ON "conversation_threads" USING btree ("store_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_action_commands_idempotency_unique" ON "bot_action_commands" USING btree ("tenant_id","store_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "bot_action_commands_processing_idx" ON "bot_action_commands" USING btree ("state","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bot_integration_grants_request_digest_unique" ON "bot_integration_grants" USING btree ("tenant_id","store_id","request_digest");--> statement-breakpoint
CREATE INDEX "bot_integration_grants_expiry_idx" ON "bot_integration_grants" USING btree ("state","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_core_migration_findings_key_unique" ON "crm_core_migration_findings" USING btree ("finding_key");--> statement-breakpoint
CREATE INDEX "crm_core_migration_findings_open_idx" ON "crm_core_migration_findings" USING btree ("finding_kind","resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_events_scope_id_unique" ON "integration_events" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_events_idempotency_unique" ON "integration_events" USING btree ("tenant_id","store_id","provider","idempotency_key");--> statement-breakpoint
CREATE INDEX "integration_events_processing_idx" ON "integration_events" USING btree ("state","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_effects_scope_id_unique" ON "provider_effects" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_effects_idempotency_unique" ON "provider_effects" USING btree ("tenant_id","store_id","provider","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_effects_external_unique" ON "provider_effects" USING btree ("provider","provider_connection_id","external_effect_id") WHERE "provider_effects"."external_effect_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "provider_effects_retry_idx" ON "provider_effects" USING btree ("state","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "acquisition_touchpoints_scope_id_unique" ON "acquisition_touchpoints" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "acquisition_touchpoints_external_unique" ON "acquisition_touchpoints" USING btree ("tenant_id","store_id","source","external_reference") WHERE "acquisition_touchpoints"."external_reference" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_receipts_scope_id_unique" ON "consent_receipts" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_receipts_evidence_unique" ON "consent_receipts" USING btree ("tenant_id","store_id","evidence_reference");--> statement-breakpoint
CREATE INDEX "consent_receipts_contact_purpose_idx" ON "consent_receipts" USING btree ("contact_id","purpose","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fact_proposals_scope_id_unique" ON "fact_proposals" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "fact_proposals_observed_fact_unique" ON "fact_proposals" USING btree ("observed_fact_id");--> statement-breakpoint
CREATE INDEX "observed_facts_contact_key_idx" ON "observed_facts" USING btree ("contact_id","fact_key","observed_at");--> statement-breakpoint

-- Persist migration exceptions without copying message bodies, credentials, or raw provider payloads.
INSERT INTO "crm_core_migration_findings" ("finding_key", "finding_kind", "source_table", "source_id", "tenant_id", "store_id", "details")
SELECT 'session-scope:' || session."id", 'cross_store', 'crm_whatsapp_sessions', session."id"::text,
       session."tenant_id", session."store_id", jsonb_build_object('connection_id', session."connection_id")
FROM "crm_whatsapp_sessions" session
LEFT JOIN "crm_connections" connection ON connection."id" = session."connection_id"
WHERE connection."id" IS NULL OR connection."tenant_id" IS DISTINCT FROM session."tenant_id"
   OR connection."store_id" IS DISTINCT FROM session."store_id"
ON CONFLICT ("finding_key") DO UPDATE SET "details" = EXCLUDED."details", "updated_at" = now();--> statement-breakpoint

INSERT INTO "crm_core_migration_findings" ("finding_key", "finding_kind", "source_table", "source_id", "tenant_id", "store_id", "details")
SELECT 'message-thread:' || message."id", 'message_without_thread', 'crm_whatsapp_messages', message."id"::text,
       message."tenant_id", message."store_id", jsonb_build_object('session_id', message."session_id")
FROM "crm_whatsapp_messages" message
LEFT JOIN "crm_whatsapp_sessions" session ON session."id" = message."session_id"
WHERE session."id" IS NULL OR session."tenant_id" IS DISTINCT FROM message."tenant_id"
   OR session."store_id" IS DISTINCT FROM message."store_id"
   OR session."connection_id" IS DISTINCT FROM message."connection_id"
ON CONFLICT ("finding_key") DO UPDATE SET "details" = EXCLUDED."details", "updated_at" = now();--> statement-breakpoint

INSERT INTO "crm_core_migration_findings" ("finding_key", "finding_kind", "source_table", "tenant_id", "store_id", "details")
SELECT 'identity-phone:' || md5(lead."tenant_id"::text || ':' || lead."store_id"::text || ':' || btrim(lead."buyer_phone")),
       'ambiguous_identity', 'leads', lead."tenant_id", lead."store_id", jsonb_build_object('identity_kind', 'phone', 'row_count', count(*))
FROM "leads" lead
WHERE lead."buyer_phone" IS NOT NULL AND btrim(lead."buyer_phone") <> ''
GROUP BY lead."tenant_id", lead."store_id", btrim(lead."buyer_phone")
HAVING count(*) > 1
ON CONFLICT ("finding_key") DO UPDATE SET "details" = EXCLUDED."details", "updated_at" = now();--> statement-breakpoint

INSERT INTO "crm_core_migration_findings" ("finding_key", "finding_kind", "source_table", "tenant_id", "store_id", "details")
SELECT 'thread-collision:' || connection."id" || ':' || md5(coalesce(session."channel_external_id", session."buyer_chat_lid", session."external_session_id", session."buyer_phone")),
       'collision', 'crm_whatsapp_sessions', session."tenant_id", session."store_id",
       jsonb_build_object('connection_id', connection."id", 'row_count', count(*))
FROM "crm_whatsapp_sessions" session
JOIN "crm_connections" connection ON connection."id" = session."connection_id"
 AND connection."tenant_id" = session."tenant_id" AND connection."store_id" = session."store_id"
GROUP BY session."tenant_id", session."store_id", connection."id",
         coalesce(session."channel_external_id", session."buyer_chat_lid", session."external_session_id", session."buyer_phone")
HAVING count(*) > 1
ON CONFLICT ("finding_key") DO UPDATE SET "details" = EXCLUDED."details", "updated_at" = now();--> statement-breakpoint

INSERT INTO "crm_core_migration_findings" ("finding_key", "finding_kind", "source_table", "source_id", "tenant_id", "store_id", "details")
SELECT 'provider-divergence:' || session."id", 'provider_divergence', 'crm_whatsapp_sessions', session."id"::text,
       session."tenant_id", session."store_id", jsonb_build_object('legacy_provider', connection."provider", 'legacy_channel', session."channel")
FROM "crm_whatsapp_sessions" session
JOIN "crm_connections" connection ON connection."id" = session."connection_id"
WHERE (connection."provider" = 'composio_instagram' AND session."channel" <> 'INSTAGRAM')
   OR (connection."provider" = 'olx_chat' AND session."channel" <> 'OLX_CHAT')
   OR (connection."provider" IN ('zapi', 'composio_whatsapp') AND session."channel" <> 'WHATSAPP')
   OR session."channel" = 'WEB_CHAT'
ON CONFLICT ("finding_key") DO UPDATE SET "details" = EXCLUDED."details", "updated_at" = now();--> statement-breakpoint

INSERT INTO "crm_core_migration_findings" ("finding_key", "finding_kind", "source_table", "source_id", "tenant_id", "store_id", "details")
SELECT 'interest-orphan:' || interest."id", 'orphan', 'lead_vehicle_interests', interest."id"::text,
       interest."tenant_id", interest."store_id", jsonb_build_object('lead_missing', lead."id" IS NULL, 'listing_missing', listing."id" IS NULL)
FROM "lead_vehicle_interests" interest
LEFT JOIN "leads" lead ON lead."id" = interest."lead_id" AND lead."tenant_id" = interest."tenant_id" AND lead."store_id" = interest."store_id"
LEFT JOIN "vehicle_listings" listing ON listing."id" = interest."listing_id" AND listing."store_id" = interest."store_id"
WHERE lead."id" IS NULL OR listing."id" IS NULL
ON CONFLICT ("finding_key") DO UPDATE SET "details" = EXCLUDED."details", "updated_at" = now();--> statement-breakpoint

-- Split legacy provider identity into authorization, transport, broker, and channel.
-- A scoped marketplace account is the canonical OLX authorization; config/token bodies are never copied.
INSERT INTO "external_account_authorizations" (
  "id", "created_at", "updated_at", "authorization_state", "broker", "external_account_id",
  "granted_scopes", "metadata", "provider", "requested_scopes", "scope_state", "revision", "tenant_id", "store_id"
)
SELECT account."id", account."created_at", account."updated_at",
       CASE account."status" WHEN 'active' THEN 'authorized'::"external_authorization_state"
            WHEN 'error' THEN 'error'::"external_authorization_state" ELSE 'pending'::"external_authorization_state" END,
       'direct', coalesce(nullif(account."config" #>> '{connection,providerAccountId}', ''), account."id"::text),
       scope_values.scopes, jsonb_build_object('legacy_integration_account_id', account."id"),
       'olx', ARRAY['basic_user_info', 'autoupload', 'autoservice', 'chat']::text[],
       CASE WHEN account."status" <> 'active' THEN 'pending'::"scope_grant_state"
            WHEN scope_values.scopes @> ARRAY['basic_user_info', 'autoupload', 'autoservice', 'chat']::text[] THEN 'granted'::"scope_grant_state"
            WHEN cardinality(scope_values.scopes) > 0 THEN 'partial'::"scope_grant_state" ELSE 'pending'::"scope_grant_state" END,
       0, account."tenant_id", account."store_id"
FROM "integration_accounts" account
CROSS JOIN LATERAL (
  SELECT ARRAY(
    SELECT DISTINCT scope_value
    FROM (
      SELECT unnest(regexp_split_to_array(coalesce(account."config" #>> '{connection,scope}', ''), E'[,\\s]+')) AS scope_value
      UNION ALL
      SELECT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(account."config" #> '{connection,scope}') = 'array'
          THEN account."config" #> '{connection,scope}' ELSE '[]'::jsonb END
      )
    ) raw_scopes
    WHERE scope_value <> ''
  )::text[] AS scopes
) scope_values
WHERE lower(account."provider") = 'olx'
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "external_account_authorizations" (
  "id", "created_at", "updated_at", "authorization_state", "broker", "external_account_id",
  "granted_scopes", "metadata", "provider", "requested_scopes", "scope_state", "revision", "tenant_id", "store_id"
)
SELECT connection."id", connection."created_at", connection."updated_at",
       CASE connection."status" WHEN 'active' THEN 'authorized'::"external_authorization_state"
            WHEN 'archived' THEN 'revoked'::"external_authorization_state"
            WHEN 'error' THEN 'error'::"external_authorization_state" ELSE 'pending'::"external_authorization_state" END,
       CASE WHEN connection."provider"::text LIKE 'composio_%' THEN 'composio'::"credential_broker" ELSE 'direct'::"credential_broker" END,
       coalesce(connection."external_connection_id", connection."external_instance_id"), '{}',
       jsonb_build_object('legacy_connection_id', connection."id"),
       CASE WHEN connection."provider"::text LIKE 'composio_%' THEN 'meta_cloud'::"transport_provider"
            WHEN connection."provider" = 'zapi' THEN 'zapi'::"transport_provider" ELSE 'olx'::"transport_provider" END,
       '{}', CASE WHEN connection."status" = 'active' THEN 'granted'::"scope_grant_state" ELSE 'pending'::"scope_grant_state" END,
       0, connection."tenant_id", connection."store_id"
FROM "crm_connections" connection
WHERE connection."provider" <> 'olx_chat'
   OR NOT EXISTS (
     SELECT 1 FROM "integration_accounts" account
     WHERE lower(account."provider") = 'olx' AND account."tenant_id" = connection."tenant_id" AND account."store_id" = connection."store_id"
   )
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "external_account_authorization_capabilities" (
  "id", "authorization_id", "capability", "state", "state_reason", "revision", "tenant_id", "store_id"
)
SELECT md5(connection."id"::text || ':messaging')::uuid, connection."id", 'messaging',
       CASE WHEN connection."status" = 'active' THEN 'granted'::"capability_grant_state" ELSE 'pending'::"capability_grant_state" END,
       'legacy_crm_connection', 0, connection."tenant_id", connection."store_id"
FROM "crm_connections" connection
WHERE connection."provider" <> 'olx_chat'
   OR NOT EXISTS (
     SELECT 1 FROM "integration_accounts" account
     WHERE lower(account."provider") = 'olx' AND account."tenant_id" = connection."tenant_id" AND account."store_id" = connection."store_id"
   )
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "external_account_authorization_capabilities" (
  "id", "authorization_id", "capability", "state", "state_reason", "revision", "tenant_id", "store_id"
)
SELECT md5(account."id"::text || ':inventory_sync')::uuid, account."id", 'inventory_sync',
       CASE WHEN account."status" = 'active' AND 'autoupload' = ANY(scope_values.scopes)
              AND coalesce(account."config" #>> '{connection,olxCapabilities,stock,status}', '') = 'active'
            THEN 'granted'::"capability_grant_state"
            WHEN 'autoupload' = ANY(scope_values.scopes) THEN 'partial'::"capability_grant_state"
            ELSE 'pending'::"capability_grant_state" END,
       CASE WHEN NOT ('autoupload' = ANY(scope_values.scopes)) THEN 'missing_autoupload_scope'
            WHEN coalesce(account."config" #>> '{connection,olxCapabilities,stock,status}', '') <> 'active' THEN 'stock_setup_not_evidenced'
            ELSE 'legacy_olx_stock_evidence' END,
       0, account."tenant_id", account."store_id"
FROM "integration_accounts" account
CROSS JOIN LATERAL (
  SELECT ARRAY(
    SELECT DISTINCT scope_value FROM (
      SELECT unnest(regexp_split_to_array(coalesce(account."config" #>> '{connection,scope}', ''), E'[,\\s]+')) AS scope_value
      UNION ALL
      SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(account."config" #> '{connection,scope}') = 'array'
        THEN account."config" #> '{connection,scope}' ELSE '[]'::jsonb END)
    ) raw_scopes WHERE scope_value <> ''
  )::text[] AS scopes
) scope_values
WHERE lower(account."provider") = 'olx'
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "external_account_authorization_capabilities" (
  "id", "authorization_id", "capability", "state", "state_reason", "revision", "tenant_id", "store_id"
)
SELECT md5(account."id"::text || ':' || capability.capability)::uuid, account."id", capability.capability::"integration_capability",
       CASE WHEN capability.required_scope = ANY(scope_values.scopes)
              AND connection."status" = 'active'
              AND coalesce(
                connection."metadata" #>> ARRAY['webhookSetup', 'capabilities', capability.metadata_key, 'status'],
                account."config" #>> ARRAY['connection', 'olxCapabilities', capability.metadata_key, 'status'],
                ''
              ) = 'active'
            THEN 'granted'::"capability_grant_state"
            WHEN capability.required_scope = ANY(scope_values.scopes) THEN 'partial'::"capability_grant_state"
            ELSE 'pending'::"capability_grant_state" END,
       CASE WHEN NOT (capability.required_scope = ANY(scope_values.scopes)) THEN 'missing_' || capability.required_scope || '_scope'
            WHEN connection."status" <> 'active' THEN 'connection_not_active'
            WHEN coalesce(
              connection."metadata" #>> ARRAY['webhookSetup', 'capabilities', capability.metadata_key, 'status'],
              account."config" #>> ARRAY['connection', 'olxCapabilities', capability.metadata_key, 'status'],
              ''
            ) <> 'active' THEN 'webhook_setup_not_evidenced'
            ELSE 'legacy_olx_webhook_evidence' END,
       0, account."tenant_id", account."store_id"
FROM "integration_accounts" account
LEFT JOIN LATERAL (
  SELECT candidate.* FROM "crm_connections" candidate
  WHERE candidate."provider" = 'olx_chat' AND candidate."tenant_id" = account."tenant_id" AND candidate."store_id" = account."store_id"
  ORDER BY (candidate."status" = 'active') DESC, candidate."updated_at" DESC, candidate."id"
  LIMIT 1
) connection ON true
CROSS JOIN (VALUES ('messaging', 'chat', 'chat'), ('lead_ingestion', 'autoservice', 'leads')) AS capability(capability, required_scope, metadata_key)
CROSS JOIN LATERAL (
  SELECT ARRAY(
    SELECT DISTINCT scope_value FROM (
      SELECT unnest(regexp_split_to_array(coalesce(account."config" #>> '{connection,scope}', ''), E'[,\\s]+')) AS scope_value
      UNION ALL
      SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(account."config" #> '{connection,scope}') = 'array'
        THEN account."config" #> '{connection,scope}' ELSE '[]'::jsonb END)
    ) raw_scopes WHERE scope_value <> ''
  )::text[] AS scopes
) scope_values
WHERE lower(account."provider") = 'olx'
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "provider_connections" (
  "id", "created_at", "updated_at", "authorization_id", "broker", "channel", "display_name",
  "external_connection_id", "external_instance_id", "metadata", "provider", "revision", "state", "tenant_id", "store_id", "webhook_url"
)
SELECT connection."id", connection."created_at", connection."updated_at",
       coalesce((
         SELECT account."id" FROM "integration_accounts" account
         WHERE connection."provider" = 'olx_chat' AND lower(account."provider") = 'olx'
           AND account."tenant_id" = connection."tenant_id" AND account."store_id" = connection."store_id"
         LIMIT 1
       ), connection."id"),
       CASE WHEN connection."provider"::text LIKE 'composio_%' THEN 'composio'::"credential_broker" ELSE 'direct'::"credential_broker" END,
       CASE WHEN connection."provider" = 'composio_instagram' THEN 'instagram'::"messaging_channel"
            WHEN connection."provider" = 'olx_chat' THEN 'olx_chat'::"messaging_channel" ELSE 'whatsapp'::"messaging_channel" END,
       connection."display_name", connection."external_connection_id", connection."external_instance_id",
       jsonb_build_object('legacy_connection_id', connection."id"),
       CASE WHEN connection."provider"::text LIKE 'composio_%' THEN 'meta_cloud'::"transport_provider"
            WHEN connection."provider" = 'zapi' THEN 'zapi'::"transport_provider" ELSE 'olx'::"transport_provider" END,
       0, connection."status"::text::"provider_connection_state", connection."tenant_id", connection."store_id", connection."webhook_url"
FROM "crm_connections" connection
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- Leads remain available during cutover; canonical rows preserve their UUIDs.
INSERT INTO "contacts" (
  "id", "created_at", "updated_at", "deleted_at", "is_deleted", "display_name", "primary_email", "primary_phone",
  "metadata", "revision", "tenant_id", "store_id"
)
SELECT lead."id", lead."created_at", lead."updated_at", lead."deleted_at", lead."is_deleted", lead."buyer_name",
       lead."buyer_email", lead."buyer_phone", jsonb_build_object('legacy_lead_id', lead."id"), 0, lead."tenant_id", lead."store_id"
FROM "leads" lead
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "contact_identities" (
  "id", "contact_id", "identity_kind", "normalized_value", "observed_at", "revision", "state", "tenant_id", "store_id"
)
SELECT md5(lead."id"::text || ':phone')::uuid, lead."id", 'phone', btrim(lead."buyer_phone"), lead."created_at", 0, 'candidate', lead."tenant_id", lead."store_id"
FROM "leads" lead WHERE lead."buyer_phone" IS NOT NULL AND btrim(lead."buyer_phone") <> ''
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "contact_identities" (
  "id", "contact_id", "identity_kind", "normalized_value", "observed_at", "revision", "state", "tenant_id", "store_id"
)
SELECT md5(lead."id"::text || ':email')::uuid, lead."id", 'email', lower(btrim(lead."buyer_email")), lead."created_at", 0, 'candidate', lead."tenant_id", lead."store_id"
FROM "leads" lead WHERE lead."buyer_email" IS NOT NULL AND btrim(lead."buyer_email") <> ''
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "opportunities" (
  "id", "created_at", "updated_at", "deleted_at", "is_deleted", "assigned_user_id", "contact_id", "last_interaction_at",
  "legacy_lead_id", "metadata", "revision", "source", "stage_key", "state", "tenant_id", "store_id"
)
SELECT lead."id", lead."created_at", lead."updated_at", lead."deleted_at", lead."is_deleted", lead."assigned_user_id", lead."id",
       lead."last_interaction_at", lead."id", lead."metadata", 0,
       CASE lead."source" WHEN 'olx' THEN 'olx'::"acquisition_source" WHEN 'instagram' THEN 'meta_ad'::"acquisition_source"
            WHEN 'public_site' THEN 'site'::"acquisition_source" ELSE 'manual'::"acquisition_source" END,
       coalesce(lead."pipeline_stage_id"::text, lead."status"::text),
       CASE WHEN lead."status" = 'won' THEN 'won'::"opportunity_state" WHEN lead."status" = 'lost' THEN 'lost'::"opportunity_state"
            WHEN lead."status" = 'archived' THEN 'cancelled'::"opportunity_state" ELSE 'open'::"opportunity_state" END,
       lead."tenant_id", lead."store_id"
FROM "leads" lead
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "acquisition_touchpoints" (
  "id", "contact_id", "external_reference", "metadata", "occurred_at", "opportunity_id", "revision", "source", "tenant_id", "store_id"
)
SELECT lead."id", lead."id", 'legacy-lead:' || lead."id", '{}', lead."created_at", lead."id", 0,
       CASE lead."source" WHEN 'olx' THEN 'olx'::"acquisition_source" WHEN 'instagram' THEN 'meta_ad'::"acquisition_source"
            WHEN 'public_site' THEN 'site'::"acquisition_source" ELSE 'manual'::"acquisition_source" END,
       lead."tenant_id", lead."store_id"
FROM "leads" lead
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "vehicle_interests" (
  "id", "created_at", "updated_at", "contact_id", "listing_id", "opportunity_id", "revision", "unit_id", "tenant_id", "store_id"
)
SELECT interest."id", interest."created_at", interest."updated_at", interest."lead_id", interest."listing_id", interest."lead_id", 0,
       interest."unit_id", interest."tenant_id", interest."store_id"
FROM "lead_vehicle_interests" interest
JOIN "contacts" contact ON contact."id" = interest."lead_id" AND contact."tenant_id" = interest."tenant_id" AND contact."store_id" = interest."store_id"
JOIN "opportunities" opportunity ON opportunity."id" = interest."lead_id" AND opportunity."tenant_id" = interest."tenant_id" AND opportunity."store_id" = interest."store_id"
JOIN "vehicle_listings" listing ON listing."id" = interest."listing_id" AND listing."store_id" = interest."store_id"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

WITH ranked_sessions AS (
  SELECT session.*, row_number() OVER (
    PARTITION BY session."connection_id", coalesce(session."channel_external_id", session."buyer_chat_lid", session."external_session_id", session."buyer_phone")
    ORDER BY session."created_at", session."id"
  ) AS identity_rank
  FROM "crm_whatsapp_sessions" session
  WHERE session."channel" IN ('WHATSAPP', 'INSTAGRAM', 'OLX_CHAT')
)
INSERT INTO "conversation_threads" (
  "id", "created_at", "updated_at", "channel", "contact_id", "external_thread_id", "last_message_at", "metadata",
  "provider_connection_id", "revision", "state", "tenant_id", "store_id"
)
SELECT session."id", session."created_at", session."updated_at",
       CASE session."channel" WHEN 'INSTAGRAM' THEN 'instagram'::"messaging_channel" WHEN 'OLX_CHAT' THEN 'olx_chat'::"messaging_channel" ELSE 'whatsapp'::"messaging_channel" END,
       contact."id", coalesce(session."channel_external_id", session."buyer_chat_lid", session."external_session_id", session."buyer_phone"),
       session."last_message_at", jsonb_build_object('legacy_session_id', session."id"), session."connection_id", 0,
       CASE WHEN session."status" IN ('COMPLETED', 'EXPIRED') THEN 'resolved'::"conversation_thread_state" ELSE 'open'::"conversation_thread_state" END,
       session."tenant_id", session."store_id"
FROM ranked_sessions session
JOIN "provider_connections" connection ON connection."id" = session."connection_id"
 AND connection."tenant_id" = session."tenant_id" AND connection."store_id" = session."store_id"
LEFT JOIN "contacts" contact ON contact."id" = session."lead_id" AND contact."tenant_id" = session."tenant_id" AND contact."store_id" = session."store_id"
WHERE session.identity_rank = 1
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

WITH mapped_sessions AS (
  SELECT session.*,
         first_value(session."id") OVER (
           PARTITION BY session."connection_id", coalesce(session."channel_external_id", session."buyer_chat_lid", session."external_session_id", session."buyer_phone")
           ORDER BY session."created_at", session."id"
         ) AS canonical_thread_id
  FROM "crm_whatsapp_sessions" session
  WHERE session."channel" IN ('WHATSAPP', 'INSTAGRAM', 'OLX_CHAT')
)
INSERT INTO "conversation_cycles" (
  "id", "created_at", "updated_at", "assigned_user_id", "closed_at", "external_cycle_id", "metadata", "opportunity_id",
  "revision", "state", "thread_id", "tenant_id", "store_id"
)
SELECT session."id", session."created_at", session."updated_at", session."assigned_user_id",
       CASE WHEN session."status" IN ('COMPLETED', 'EXPIRED') THEN coalesce(session."last_message_at", session."updated_at") END,
       coalesce(session."external_session_id", session."id"::text), jsonb_build_object('legacy_status', session."status"), opportunity."id", 0,
       CASE WHEN session."status" = 'COMPLETED' THEN 'completed'::"conversation_cycle_state"
            WHEN session."status" = 'EXPIRED' THEN 'expired'::"conversation_cycle_state" ELSE 'active'::"conversation_cycle_state" END,
       thread."id", session."tenant_id", session."store_id"
FROM mapped_sessions session
JOIN "conversation_threads" thread ON thread."id" = session.canonical_thread_id AND thread."tenant_id" = session."tenant_id" AND thread."store_id" = session."store_id"
LEFT JOIN "opportunities" opportunity ON opportunity."id" = session."lead_id" AND opportunity."tenant_id" = session."tenant_id" AND opportunity."store_id" = session."store_id"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "conversation_attendances" (
  "id", "created_at", "updated_at", "assigned_user_id", "changed_at", "cycle_id", "revision", "state", "thread_id", "tenant_id", "store_id"
)
SELECT session."id", session."created_at", session."updated_at", session."assigned_user_id",
       coalesce(session."human_attendance_changed_at", session."updated_at"), cycle."id", 0,
       CASE WHEN session."human_attendance_state" = 'WAITING_HUMAN' THEN 'handoff_requested'::"conversation_attendance_state"
            WHEN session."human_attendance_state" = 'IN_HUMAN_SERVICE' AND session."assigned_user_id" IS NOT NULL THEN 'human_active'::"conversation_attendance_state"
            WHEN session."status" = 'HUMAN_TAKEOVER' THEN 'handoff_requested'::"conversation_attendance_state"
            ELSE 'bot_active'::"conversation_attendance_state" END,
       cycle."thread_id", session."tenant_id", session."store_id"
FROM "crm_whatsapp_sessions" session
JOIN "conversation_cycles" cycle ON cycle."id" = session."id" AND cycle."tenant_id" = session."tenant_id" AND cycle."store_id" = session."store_id"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "canonical_messages" (
  "id", "created_at", "updated_at", "content", "cycle_id", "direction", "media_type", "media_url", "message_type", "metadata",
  "occurred_at", "provider", "provider_connection_id", "provider_message_id", "revision", "sender", "status", "thread_id", "tenant_id", "store_id"
)
SELECT message."id", message."created_at", message."updated_at", message."content", cycle."id",
       lower(message."direction"::text)::"canonical_message_direction", message."media_type", message."media_url", lower(message."type"::text),
       message."metadata", coalesce(message."provider_timestamp", message."created_at"), connection."provider", connection."id",
       coalesce(message."channel_message_id", message."external_id"), 0,
       CASE message."sender_type" WHEN 'CUSTOMER' THEN 'customer'::"canonical_message_sender" WHEN 'HUMAN' THEN 'human'::"canonical_message_sender"
            WHEN 'AI' THEN 'bot'::"canonical_message_sender" WHEN 'SYSTEM' THEN 'system'::"canonical_message_sender" ELSE 'unknown'::"canonical_message_sender" END,
       lower(message."status"::text)::"canonical_message_status", cycle."thread_id", message."tenant_id", message."store_id"
FROM "crm_whatsapp_messages" message
JOIN "conversation_cycles" cycle ON cycle."id" = message."session_id" AND cycle."tenant_id" = message."tenant_id" AND cycle."store_id" = message."store_id"
JOIN "provider_connections" connection ON connection."id" = message."connection_id" AND connection."tenant_id" = message."tenant_id" AND connection."store_id" = message."store_id"
ON CONFLICT DO NOTHING;--> statement-breakpoint

CREATE FUNCTION "crm_core_provider_is_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."provider" IS DISTINCT FROM OLD."provider" THEN
    RAISE EXCEPTION 'CRM core provider is immutable';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "provider_connections_provider_immutable" BEFORE UPDATE ON "provider_connections"
FOR EACH ROW EXECUTE FUNCTION "crm_core_provider_is_immutable"();--> statement-breakpoint
CREATE TRIGGER "canonical_messages_provider_immutable" BEFORE UPDATE ON "canonical_messages"
FOR EACH ROW EXECUTE FUNCTION "crm_core_provider_is_immutable"();--> statement-breakpoint
CREATE TRIGGER "integration_events_provider_immutable" BEFORE UPDATE ON "integration_events"
FOR EACH ROW EXECUTE FUNCTION "crm_core_provider_is_immutable"();--> statement-breakpoint
CREATE TRIGGER "bot_action_commands_provider_immutable" BEFORE UPDATE ON "bot_action_commands"
FOR EACH ROW EXECUTE FUNCTION "crm_core_provider_is_immutable"();--> statement-breakpoint
CREATE TRIGGER "provider_effects_provider_immutable" BEFORE UPDATE ON "provider_effects"
FOR EACH ROW EXECUTE FUNCTION "crm_core_provider_is_immutable"();--> statement-breakpoint

CREATE FUNCTION "crm_core_reject_human_bot_effect"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "bot_action_commands" command
    WHERE command."id" = NEW."command_id" AND command."authorization_class" = 'human_approved'
  ) THEN
    RAISE EXCEPTION 'Human-approved actions cannot execute through the external bot gateway';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "provider_effects_reject_human_bot_effect" BEFORE INSERT OR UPDATE ON "provider_effects"
FOR EACH ROW EXECUTE FUNCTION "crm_core_reject_human_bot_effect"();--> statement-breakpoint

-- A stable, queryable reconciliation summary for operators and migration reruns.
INSERT INTO "crm_core_migration_findings" ("finding_key", "finding_kind", "source_table", "details")
VALUES (
  'migration-summary:0031', 'summary', 'crm_core_migration',
  jsonb_build_object(
    'legacy_leads', (SELECT count(*) FROM "leads"),
    'canonical_contacts', (SELECT count(*) FROM "contacts" WHERE "metadata" ? 'legacy_lead_id'),
    'canonical_opportunities', (SELECT count(*) FROM "opportunities" WHERE "legacy_lead_id" IS NOT NULL),
    'legacy_connections', (SELECT count(*) FROM "crm_connections"),
    'canonical_connections', (SELECT count(*) FROM "provider_connections"),
    'legacy_sessions', (SELECT count(*) FROM "crm_whatsapp_sessions"),
    'canonical_threads', (SELECT count(*) FROM "conversation_threads"),
    'legacy_messages', (SELECT count(*) FROM "crm_whatsapp_messages"),
    'canonical_messages', (SELECT count(*) FROM "canonical_messages"),
    'open_findings', (SELECT count(*) FROM "crm_core_migration_findings" WHERE "resolved_at" IS NULL)
  )
)
ON CONFLICT ("finding_key") DO UPDATE
SET "details" = EXCLUDED."details", "updated_at" = now(), "revision" = "crm_core_migration_findings"."revision" + 1;
