CREATE TYPE "public"."audit_actor_kind" AS ENUM('integration', 'public', 'system', 'user');--> statement-breakpoint
CREATE TYPE "public"."audit_category" AS ENUM('authentication', 'authorization', 'data_access', 'data_change', 'integration', 'system');--> statement-breakpoint
CREATE TYPE "public"."audit_criticality" AS ENUM('critical', 'high', 'low', 'medium');--> statement-breakpoint
CREATE TYPE "public"."audit_data_classification" AS ENUM('confidential', 'internal', 'public', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."audit_failure_tier" AS ENUM('best_effort', 'important', 'required');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('attempted', 'denied', 'failed', 'succeeded');--> statement-breakpoint
CREATE TYPE "public"."audit_severity" AS ENUM('critical', 'debug', 'error', 'info', 'warning');--> statement-breakpoint
CREATE TABLE "audit_actors" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" varchar(191) NOT NULL,
	"actor_kind" "audit_actor_kind" NOT NULL,
	"display_name" varchar(191),
	"external_id" varchar(191),
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_entities" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" varchar(191),
	"entity_id" varchar(191) NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_id" uuid,
	"tenant_id" uuid
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" varchar(120) NOT NULL,
	"actor_id" varchar(191) NOT NULL,
	"actor_kind" "audit_actor_kind" NOT NULL,
	"category" "audit_category",
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correlation_id" varchar(191),
	"criticality" "audit_criticality" DEFAULT 'low' NOT NULL,
	"data_classification" "audit_data_classification" DEFAULT 'internal' NOT NULL,
	"entity_id" varchar(191) NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"failure_tier" "audit_failure_tier" DEFAULT 'best_effort' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "audit_outcome" DEFAULT 'succeeded' NOT NULL,
	"provider_event_id" varchar(191),
	"provider_name" varchar(120),
	"related_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" varchar(191) NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"severity" "audit_severity" DEFAULT 'info' NOT NULL,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_id" uuid,
	"summary" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tenant_id" uuid
);
--> statement-breakpoint
CREATE TABLE "audit_requests" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"causation_id" varchar(191),
	"correlation_id" varchar(191),
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" varchar(191),
	"ip_address" varchar(80),
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"method" varchar(16),
	"path" varchar(1024),
	"request_id" varchar(191) NOT NULL,
	"source_service" varchar(120),
	"user_agent" varchar(1024)
);
--> statement-breakpoint
CREATE TABLE "audit_sink_failures" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"event_id" uuid,
	"failure_tier" "audit_failure_tier" NOT NULL,
	"last_error" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" varchar(191) NOT NULL,
	"resolved_at" timestamp with time zone,
	"sink_name" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_actors_actor_idx" ON "audit_actors" USING btree ("actor_kind","actor_id");--> statement-breakpoint
CREATE INDEX "audit_actors_external_id_idx" ON "audit_actors" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "audit_actors_last_seen_at_idx" ON "audit_actors" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "audit_entities_entity_idx" ON "audit_entities" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_entities_last_seen_at_idx" ON "audit_entities" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "audit_entities_store_id_idx" ON "audit_entities" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "audit_entities_tenant_id_idx" ON "audit_entities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_events_category_idx" ON "audit_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_id_idx" ON "audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_outcome_idx" ON "audit_events" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "audit_events_request_id_idx" ON "audit_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_events_severity_idx" ON "audit_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_events_store_id_idx" ON "audit_events" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "audit_events_tenant_id_idx" ON "audit_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_requests_correlation_id_idx" ON "audit_requests" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "audit_requests_last_seen_at_idx" ON "audit_requests" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "audit_requests_request_id_idx" ON "audit_requests" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_sink_failures_event_id_idx" ON "audit_sink_failures" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "audit_sink_failures_request_id_idx" ON "audit_sink_failures" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_sink_failures_resolved_at_idx" ON "audit_sink_failures" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "audit_sink_failures_sink_name_idx" ON "audit_sink_failures" USING btree ("sink_name");