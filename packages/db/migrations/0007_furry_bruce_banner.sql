CREATE TYPE "public"."financing_inquiry_event_kind" AS ENUM('created', 'submitted', 'provider_result', 'condition_recorded', 'failed', 'consent_linked');--> statement-breakpoint
CREATE TYPE "public"."financing_operation_request_status" AS ENUM('queued', 'submitted', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."financing_operation_request_type" AS ENUM('simulation', 'proposal', 'status_sync', 'callback_sync');--> statement-breakpoint
CREATE TYPE "public"."financing_customer_consent_status" AS ENUM('granted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."financing_provider" AS ENUM('credere');--> statement-breakpoint
CREATE TYPE "public"."financing_provider_account_status" AS ENUM('pending', 'active', 'paused', 'disconnected', 'error', 'archived');--> statement-breakpoint
CREATE TYPE "public"."financing_provider_bank_status" AS ENUM('unknown', 'okay', 'restricted', 'error', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."financing_provider_environment" AS ENUM('sandbox', 'production');--> statement-breakpoint
CREATE TYPE "public"."financing_provider_store_mapping_status" AS ENUM('active', 'inactive', 'error', 'archived');--> statement-breakpoint
CREATE TYPE "public"."financing_provider_token_kind" AS ENUM('access_token', 'refresh_token', 'id_token');--> statement-breakpoint
CREATE TYPE "public"."provider_oauth_transaction_status" AS ENUM('pending', 'consumed', 'expired', 'cancelled', 'failed');--> statement-breakpoint
CREATE TABLE "financing_inquiry_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"event_key" varchar(191) NOT NULL,
	"event_kind" "financing_inquiry_event_kind" NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"operation_request_id" uuid,
	"provider" "financing_provider" DEFAULT 'credere' NOT NULL,
	"provider_event_id" varchar(191),
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financing_operation_requests" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"consent_id" uuid,
	"error_code" varchar(120),
	"error_message" text,
	"idempotency_key" varchar(191) NOT NULL,
	"inquiry_id" uuid,
	"mapping_id" uuid,
	"operation_type" "financing_operation_request_type" NOT NULL,
	"provider" "financing_provider" NOT NULL,
	"provider_environment" "financing_provider_environment" DEFAULT 'production' NOT NULL,
	"provider_operation_id" varchar(191),
	"requested_by_user_id" uuid,
	"result_code" varchar(120),
	"result_message" text,
	"result_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "financing_operation_request_status" DEFAULT 'queued' NOT NULL,
	"store_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "financing_operation_requests_attempt_count_non_negative" CHECK ("financing_operation_requests"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "financing_customer_consents" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applicant_document_hash" varchar(64) NOT NULL,
	"applicant_document_last4" varchar(4) NOT NULL,
	"consent_version" varchar(80) NOT NULL,
	"evidence_ref" varchar(191),
	"expires_at" timestamp with time zone,
	"granted_at" timestamp with time zone NOT NULL,
	"granted_by_user_id" uuid,
	"lead_id" uuid,
	"purpose" varchar(120) NOT NULL,
	"revoked_at" timestamp with time zone,
	"status" "financing_customer_consent_status" DEFAULT 'granted' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "financing_customer_consents_document_hash_sha256" CHECK ("financing_customer_consents"."applicant_document_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "financing_customer_consents_document_last4_valid" CHECK ("financing_customer_consents"."applicant_document_last4" ~ '^[0-9]{4}$'),
	CONSTRAINT "financing_customer_consents_expiry_valid" CHECK ("financing_customer_consents"."expires_at" IS NULL OR "financing_customer_consents"."expires_at" > "financing_customer_consents"."granted_at"),
	CONSTRAINT "financing_customer_consents_revocation_consistent" CHECK ((
        ("financing_customer_consents"."status" = 'revoked' AND "financing_customer_consents"."revoked_at" IS NOT NULL)
        OR
        ("financing_customer_consents"."status" <> 'revoked' AND "financing_customer_consents"."revoked_at" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "financing_provider_accounts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	"display_name" varchar(160) NOT NULL,
	"environment" "financing_provider_environment" NOT NULL,
	"external_account_id" varchar(191),
	"last_validated_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" "financing_provider" NOT NULL,
	"status" "financing_provider_account_status" DEFAULT 'pending' NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "financing_provider_accounts_connection_dates_valid" CHECK ("financing_provider_accounts"."disconnected_at" IS NULL OR "financing_provider_accounts"."connected_at" IS NULL OR "financing_provider_accounts"."disconnected_at" >= "financing_provider_accounts"."connected_at")
);
--> statement-breakpoint
CREATE TABLE "financing_provider_store_banks" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"bank_febraban_code" varchar(16) NOT NULL,
	"bank_name" varchar(120),
	"credential_status" "financing_provider_bank_status" DEFAULT 'unknown' NOT NULL,
	"external_bank_id" varchar(191),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"mapping_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "financing_provider_store_banks_code_present" CHECK (length(trim("financing_provider_store_banks"."bank_febraban_code")) > 0)
);
--> statement-breakpoint
CREATE TABLE "financing_provider_store_mappings" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"external_store_id" varchar(191) NOT NULL,
	"last_validated_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "financing_provider_store_mapping_status" DEFAULT 'active' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "financing_provider_store_mappings_external_store_present" CHECK (length(trim("financing_provider_store_mappings"."external_store_id")) > 0)
);
--> statement-breakpoint
CREATE TABLE "financing_provider_tokens" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"encrypted_token" text NOT NULL,
	"encryption_key_ref" varchar(191) NOT NULL,
	"expires_at" timestamp with time zone,
	"fingerprint" varchar(64) NOT NULL,
	"issued_at" timestamp with time zone,
	"kind" "financing_provider_token_kind" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revoked_at" timestamp with time zone,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "financing_provider_tokens_fingerprint_sha256" CHECK ("financing_provider_tokens"."fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "provider_oauth_transactions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid,
	"code_challenge_method" varchar(16),
	"code_verifier_ciphertext" text,
	"consumed_at" timestamp with time zone,
	"consumed_by_user_id" uuid,
	"environment" "financing_provider_environment" NOT NULL,
	"error_code" varchar(120),
	"error_message" text,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" "financing_provider" NOT NULL,
	"redirect_uri_hash" varchar(64) NOT NULL,
	"requested_by_user_id" uuid,
	"state_hash" varchar(64) NOT NULL,
	"status" "provider_oauth_transaction_status" DEFAULT 'pending' NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "provider_oauth_transactions_state_hash_sha256" CHECK ("provider_oauth_transactions"."state_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "provider_oauth_transactions_redirect_uri_hash_sha256" CHECK ("provider_oauth_transactions"."redirect_uri_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "provider_oauth_transactions_pkce_consistent" CHECK ((
        ("provider_oauth_transactions"."code_verifier_ciphertext" IS NULL AND "provider_oauth_transactions"."code_challenge_method" IS NULL)
        OR
        ("provider_oauth_transactions"."code_verifier_ciphertext" IS NOT NULL AND "provider_oauth_transactions"."code_challenge_method" IS NOT NULL)
      )),
	CONSTRAINT "provider_oauth_transactions_single_use_consistent" CHECK ((
        ("provider_oauth_transactions"."status" = 'consumed' AND "provider_oauth_transactions"."consumed_at" IS NOT NULL)
        OR
        ("provider_oauth_transactions"."status" <> 'consumed' AND "provider_oauth_transactions"."consumed_at" IS NULL AND "provider_oauth_transactions"."consumed_by_user_id" IS NULL)
      )),
	CONSTRAINT "provider_oauth_transactions_ttl_valid" CHECK ("provider_oauth_transactions"."expires_at" > "provider_oauth_transactions"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stores_id_tenant_unique" ON "stores" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_provider_accounts_id_tenant_unique" ON "financing_provider_accounts" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_provider_store_mappings_id_scope_unique" ON "financing_provider_store_mappings" USING btree ("id","account_id","tenant_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_customer_consents_id_scope_unique" ON "financing_customer_consents" USING btree ("id","tenant_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_operation_requests_id_scope_unique" ON "financing_operation_requests" USING btree ("id","tenant_id","store_id");--> statement-breakpoint
ALTER TABLE "financing_conditions" DROP CONSTRAINT "financing_conditions_inquiry_id_financing_inquiries_id_fk";
--> statement-breakpoint
UPDATE "financing_inquiries"
SET
	"metadata" = coalesce("metadata", '{}'::jsonb) || jsonb_build_object(
		'legacyProvider',
		"provider",
		'officialOperation',
		false
	),
	"provider" = 'credere'
WHERE "provider" <> 'credere';--> statement-breakpoint
ALTER TABLE "financing_inquiries" ALTER COLUMN "provider" SET DATA TYPE "public"."financing_provider" USING "provider"::"public"."financing_provider";--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "approved_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "bank_febraban_code" varchar(16);--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "down_payment_cents" integer;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "external_condition_id" varchar(191);--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "interest_rate_basis_points" integer;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "is_selected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "monthly_payment_cents" integer;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "provider" "financing_provider" DEFAULT 'credere' NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "provider_result_code" varchar(120);--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "provider_result_message" text;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "provider_result_summary" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "store_id" uuid;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "financing_conditions"
SET
  "store_id" = "financing_inquiries"."store_id",
  "tenant_id" = "financing_inquiries"."tenant_id"
FROM "financing_inquiries"
WHERE "financing_conditions"."inquiry_id" = "financing_inquiries"."id";--> statement-breakpoint
ALTER TABLE "financing_conditions" ALTER COLUMN "store_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_conditions" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "applicant_document_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "applicant_document_last4" varchar(4);--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "consent_id" uuid;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "idempotency_key" varchar(191);--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "operation_request_id" uuid;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "provider_environment" "financing_provider_environment" DEFAULT 'production' NOT NULL;--> statement-breakpoint
UPDATE "financing_inquiries"
SET "provider_environment" = 'sandbox'
WHERE "metadata" ? 'legacyProvider';--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "provider_operation_id" varchar(191);--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "provider_result_code" varchar(120);--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "provider_result_message" text;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "provider_result_summary" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "requested_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "store_mapping_id" uuid;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "financing_inquiries_id_scope_unique" ON "financing_inquiries" USING btree ("id","tenant_id","store_id");--> statement-breakpoint
ALTER TABLE "financing_inquiry_events" ADD CONSTRAINT "financing_inquiry_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiry_events" ADD CONSTRAINT "financing_inquiry_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiry_events" ADD CONSTRAINT "financing_inquiry_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiry_events" ADD CONSTRAINT "financing_inquiry_events_inquiry_scope_fk" FOREIGN KEY ("inquiry_id","tenant_id","store_id") REFERENCES "public"."financing_inquiries"("id","tenant_id","store_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiry_events" ADD CONSTRAINT "financing_inquiry_events_operation_scope_fk" FOREIGN KEY ("operation_request_id","tenant_id","store_id") REFERENCES "public"."financing_operation_requests"("id","tenant_id","store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_operation_requests" ADD CONSTRAINT "financing_operation_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_operation_requests" ADD CONSTRAINT "financing_operation_requests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_operation_requests" ADD CONSTRAINT "financing_operation_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_operation_requests" ADD CONSTRAINT "financing_operation_requests_account_scope_fk" FOREIGN KEY ("account_id","tenant_id") REFERENCES "public"."financing_provider_accounts"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_operation_requests" ADD CONSTRAINT "financing_operation_requests_mapping_scope_fk" FOREIGN KEY ("mapping_id","account_id","tenant_id","store_id") REFERENCES "public"."financing_provider_store_mappings"("id","account_id","tenant_id","store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_operation_requests" ADD CONSTRAINT "financing_operation_requests_consent_scope_fk" FOREIGN KEY ("consent_id","tenant_id","store_id") REFERENCES "public"."financing_customer_consents"("id","tenant_id","store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_operation_requests" ADD CONSTRAINT "financing_operation_requests_inquiry_scope_fk" FOREIGN KEY ("inquiry_id","tenant_id","store_id") REFERENCES "public"."financing_inquiries"("id","tenant_id","store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_customer_consents" ADD CONSTRAINT "financing_customer_consents_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_customer_consents" ADD CONSTRAINT "financing_customer_consents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_customer_consents" ADD CONSTRAINT "financing_customer_consents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_customer_consents" ADD CONSTRAINT "financing_customer_consents_store_scope_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_accounts" ADD CONSTRAINT "financing_provider_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_store_banks" ADD CONSTRAINT "financing_provider_store_banks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_store_banks" ADD CONSTRAINT "financing_provider_store_banks_mapping_scope_fk" FOREIGN KEY ("mapping_id","account_id","tenant_id","store_id") REFERENCES "public"."financing_provider_store_mappings"("id","account_id","tenant_id","store_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_store_mappings" ADD CONSTRAINT "financing_provider_store_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_store_mappings" ADD CONSTRAINT "financing_provider_store_mappings_account_scope_fk" FOREIGN KEY ("account_id","tenant_id") REFERENCES "public"."financing_provider_accounts"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_store_mappings" ADD CONSTRAINT "financing_provider_store_mappings_store_scope_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_tokens" ADD CONSTRAINT "financing_provider_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_provider_tokens" ADD CONSTRAINT "financing_provider_tokens_account_scope_fk" FOREIGN KEY ("account_id","tenant_id") REFERENCES "public"."financing_provider_accounts"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD CONSTRAINT "provider_oauth_transactions_consumed_by_user_id_users_id_fk" FOREIGN KEY ("consumed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD CONSTRAINT "provider_oauth_transactions_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD CONSTRAINT "provider_oauth_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD CONSTRAINT "provider_oauth_transactions_account_scope_fk" FOREIGN KEY ("account_id","tenant_id") REFERENCES "public"."financing_provider_accounts"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "financing_inquiry_events_event_key_unique" ON "financing_inquiry_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "financing_inquiry_events_inquiry_created_idx" ON "financing_inquiry_events" USING btree ("inquiry_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_operation_requests_idempotency_unique" ON "financing_operation_requests" USING btree ("tenant_id","store_id","provider","idempotency_key");--> statement-breakpoint
CREATE INDEX "financing_operation_requests_status_idx" ON "financing_operation_requests" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "financing_operation_requests_inquiry_idx" ON "financing_operation_requests" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "financing_customer_consents_document_idx" ON "financing_customer_consents" USING btree ("tenant_id","store_id","applicant_document_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_provider_accounts_tenant_provider_env_unique" ON "financing_provider_accounts" USING btree ("tenant_id","provider","environment");--> statement-breakpoint
CREATE INDEX "financing_provider_accounts_tenant_status_idx" ON "financing_provider_accounts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_provider_store_banks_mapping_code_unique" ON "financing_provider_store_banks" USING btree ("mapping_id","bank_febraban_code");--> statement-breakpoint
CREATE INDEX "financing_provider_store_banks_store_status_idx" ON "financing_provider_store_banks" USING btree ("store_id","is_active","credential_status");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_provider_store_mappings_local_unique" ON "financing_provider_store_mappings" USING btree ("account_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_provider_store_mappings_external_unique" ON "financing_provider_store_mappings" USING btree ("account_id","external_store_id");--> statement-breakpoint
CREATE INDEX "financing_provider_store_mappings_store_status_idx" ON "financing_provider_store_mappings" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "financing_provider_tokens_account_kind_idx" ON "financing_provider_tokens" USING btree ("account_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_provider_tokens_fingerprint_unique" ON "financing_provider_tokens" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_oauth_transactions_state_hash_unique" ON "provider_oauth_transactions" USING btree ("state_hash");--> statement-breakpoint
CREATE INDEX "provider_oauth_transactions_tenant_status_idx" ON "provider_oauth_transactions" USING btree ("tenant_id","status","expires_at");--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD CONSTRAINT "financing_conditions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD CONSTRAINT "financing_conditions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD CONSTRAINT "financing_conditions_inquiry_scope_fk" FOREIGN KEY ("inquiry_id","tenant_id","store_id") REFERENCES "public"."financing_inquiries"("id","tenant_id","store_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_account_scope_fk" FOREIGN KEY ("account_id","tenant_id") REFERENCES "public"."financing_provider_accounts"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_mapping_scope_fk" FOREIGN KEY ("store_mapping_id","account_id","tenant_id","store_id") REFERENCES "public"."financing_provider_store_mappings"("id","account_id","tenant_id","store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_consent_scope_fk" FOREIGN KEY ("consent_id","tenant_id","store_id") REFERENCES "public"."financing_customer_consents"("id","tenant_id","store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financing_conditions_bank_code_idx" ON "financing_conditions" USING btree ("bank_febraban_code");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_conditions_external_unique" ON "financing_conditions" USING btree ("provider","external_condition_id") WHERE "financing_conditions"."external_condition_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "financing_inquiries_account_status_idx" ON "financing_inquiries" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "financing_inquiries_provider_operation_idx" ON "financing_inquiries" USING btree ("provider","provider_environment","provider_operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_inquiries_idempotency_unique" ON "financing_inquiries" USING btree ("tenant_id","store_id","provider","idempotency_key") WHERE "financing_inquiries"."idempotency_key" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD CONSTRAINT "financing_conditions_installments_positive" CHECK ("financing_conditions"."installments" > 0);--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD CONSTRAINT "financing_conditions_amounts_non_negative" CHECK (coalesce("financing_conditions"."approved_amount_cents", 0) >= 0
        AND coalesce("financing_conditions"."down_payment_cents", 0) >= 0
        AND coalesce("financing_conditions"."monthly_payment_cents", 0) >= 0
        AND coalesce("financing_conditions"."total_amount_cents", 0) >= 0);--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD CONSTRAINT "financing_conditions_interest_rate_non_negative" CHECK ("financing_conditions"."interest_rate_basis_points" IS NULL OR "financing_conditions"."interest_rate_basis_points" >= 0);--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_document_hash_sha256" CHECK ("financing_inquiries"."applicant_document_hash" IS NULL OR "financing_inquiries"."applicant_document_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_document_last4_valid" CHECK ("financing_inquiries"."applicant_document_last4" IS NULL OR "financing_inquiries"."applicant_document_last4" ~ '^[0-9]{4}$');--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_submission_dates_valid" CHECK ("financing_inquiries"."completed_at" IS NULL OR "financing_inquiries"."submitted_at" IS NULL OR "financing_inquiries"."completed_at" >= "financing_inquiries"."submitted_at");
--> statement-breakpoint
INSERT INTO "role_template_permissions" ("role_template_id", "permission_key")
VALUES
  ('22222222-2222-4222-8222-222222222222', 'financing.connection.manage'),
  ('22222222-2222-4222-8222-222222222222', 'financing.simulation.create'),
  ('22222222-2222-4222-8222-222222222222', 'financing.simulation.read'),
  ('11111111-1111-4111-8111-111111111111', 'financing.connection.manage'),
  ('11111111-1111-4111-8111-111111111111', 'financing.simulation.create'),
  ('11111111-1111-4111-8111-111111111111', 'financing.simulation.read'),
  ('55555555-5555-4555-8555-555555555555', 'financing.connection.manage'),
  ('55555555-5555-4555-8555-555555555555', 'financing.simulation.create'),
  ('55555555-5555-4555-8555-555555555555', 'financing.simulation.read'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'financing.simulation.create'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'financing.simulation.read'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'financing.simulation.create'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'financing.simulation.read'),
  ('eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee', 'financing.simulation.read')
ON CONFLICT ("role_template_id", "permission_key") DO NOTHING;
