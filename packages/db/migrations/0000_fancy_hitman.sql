CREATE TYPE "public"."vehicle_acquisition_channel" AS ENUM('trade_in_lead', 'direct_person', 'supplier_company', 'auto_avaliar', 'repasse_partner', 'auction', 'consignment', 'marketplace', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_acquisition_commission_timing" AS ENUM('acquisition', 'reserve', 'closed');--> statement-breakpoint
CREATE TYPE "public"."vehicle_supplier_kind" AS ENUM('lead', 'person', 'company', 'provider', 'partner', 'auction', 'other');--> statement-breakpoint
CREATE TYPE "public"."automation_approval_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."automation_risk_level" AS ENUM('low');--> statement-breakpoint
CREATE TYPE "public"."automation_run_status" AS ENUM('awaiting_approval', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."automation_step_kind" AS ENUM('read_only_preview');--> statement-breakpoint
CREATE TYPE "public"."automation_step_status" AS ENUM('awaiting_approval', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_link_status" AS ENUM('draft', 'active', 'paid', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'held', 'released', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."billing_catalog_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'overdue', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_item_type" AS ENUM('plan', 'addon');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."billing_checkout_status" AS ENUM('created', 'paid', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."crm_connection_provider" AS ENUM('zapi');--> statement-breakpoint
CREATE TYPE "public"."crm_connection_status" AS ENUM('sandbox', 'active', 'paused', 'disconnected', 'error', 'archived');--> statement-breakpoint
CREATE TYPE "public"."crm_sync_status" AS ENUM('pending', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."crm_pipeline_stage_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_channel" AS ENUM('OLX_CHAT', 'WEB_CHAT', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_message_direction" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_message_sender_type" AS ENUM('AI', 'CUSTOMER', 'HUMAN', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_message_status" AS ENUM('DELIVERED', 'FAILED', 'PENDING', 'READ', 'SENT');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_message_type" AS ENUM('AUDIO', 'CATALOG', 'CONTACT', 'DOCUMENT', 'IMAGE', 'INTERACTIVE', 'LOCATION', 'STICKER', 'TEMPLATE', 'TEXT', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_quick_message_kind" AS ENUM('AUDIO', 'IMAGE', 'TEXT');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_session_status" AS ENUM('ACTIVE', 'COMPLETED', 'EXPIRED', 'HUMAN_TAKEOVER', 'MINIBOT_ACTIVE');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_campaign_recipient_status" AS ENUM('cancelled', 'failed', 'pending', 'replied', 'secondary_scheduled', 'secondary_sent', 'sent');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_campaign_status" AS ENUM('cancelled', 'completed', 'draft', 'paused', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."crm_whatsapp_scheduled_message_status" AS ENUM('cancelled', 'failed', 'pending', 'sending', 'sent');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('delivery_term', 'finance_receipt', 'invoice', 'vehicle_registration', 'inspection', 'power_of_attorney', 'reservation_receipt', 'sale_receipt', 'sale_contract', 'test_drive', 'buyer_document', 'internal', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_link_target" AS ENUM('store', 'vehicle_unit', 'lead', 'sale', 'sale_payment', 'finance_entry', 'financing_inquiry', 'fiscal_document');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'pending_signature', 'signed', 'issued', 'voided', 'archived');--> statement-breakpoint
CREATE TYPE "public"."api_client_status" AS ENUM('active', 'revoked', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."api_idempotency_status" AS ENUM('completed', 'failed', 'started');--> statement-breakpoint
CREATE TYPE "public"."api_webhook_status" AS ENUM('active', 'paused', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."commission_rule_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."commission_rule_type" AS ENUM('fixed_amount', 'manual', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."finance_entry_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."finance_entry_type" AS ENUM('expense', 'revenue', 'commission');--> statement-breakpoint
CREATE TYPE "public"."finance_link_target" AS ENUM('document', 'lead', 'sale', 'sale_payment', 'vehicle_cost', 'vehicle_listing', 'vehicle_unit');--> statement-breakpoint
CREATE TYPE "public"."finance_recurrence_frequency" AS ENUM('monthly', 'weekly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."finance_auto_entry_event" AS ENUM('vehicle_sale_closed', 'financing_approved', 'insurance_issued', 'transfer_documentation_charged', 'consortium_sold');--> statement-breakpoint
CREATE TYPE "public"."finance_auto_entry_recipient_kind" AS ENUM('event_seller', 'fixed_user', 'none');--> statement-breakpoint
CREATE TYPE "public"."finance_auto_entry_rule_resolution" AS ENUM('additive', 'seller_override');--> statement-breakpoint
CREATE TYPE "public"."finance_auto_entry_rule_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."fiscal_document_kind" AS ENUM('nfe', 'nfse');--> statement-breakpoint
CREATE TYPE "public"."fiscal_document_status" AS ENUM('draft', 'queued', 'processing', 'issued', 'authorized', 'rejected', 'cancelled', 'failed', 'error');--> statement-breakpoint
CREATE TYPE "public"."fiscal_link_target" AS ENUM('sale', 'lead', 'finance_entry', 'store_event');--> statement-breakpoint
CREATE TYPE "public"."fiscal_recipient_document_type" AS ENUM('cnpj', 'cpf');--> statement-breakpoint
CREATE TYPE "public"."fiscal_service_template_use_case" AS ENUM('financing_commission', 'financing_intermediation', 'bank_marketing', 'insurance_commission', 'consortium_commission', 'warranty_commission', 'administrative_service', 'vehicle_documentation_service', 'other');--> statement-breakpoint
CREATE TYPE "public"."entitlement_status" AS ENUM('active', 'inactive', 'trialing', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."role_template_key" AS ENUM('agency', 'admin', 'investor', 'owner', 'salesman', 'supervisor');--> statement-breakpoint
CREATE TYPE "public"."identity_invitation_status" AS ENUM('pending', 'sent', 'accepted', 'revoked', 'expired', 'send_failed');--> statement-breakpoint
CREATE TYPE "public"."integration_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'inactive', 'error');--> statement-breakpoint
CREATE TYPE "public"."marketplace_catalog_mapping_status" AS ENUM('resolved', 'unresolved');--> statement-breakpoint
CREATE TYPE "public"."vehicle_condition" AS ENUM('new', 'used', 'certified_pre_owned');--> statement-breakpoint
CREATE TYPE "public"."vehicle_cost_kind" AS ENUM('acquisition', 'preparation', 'repair', 'transport', 'fee', 'tax', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_engine_aspiration" AS ENUM('aspirated', 'turbo', 'supercharged', 'twincharged');--> statement-breakpoint
CREATE TYPE "public"."vehicle_fuel_type" AS ENUM('gasoline', 'ethanol', 'flex', 'diesel', 'hybrid', 'electric', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_listing_status" AS ENUM('draft', 'in_preparation', 'published', 'sold_out', 'unpublished', 'archived');--> statement-breakpoint
CREATE TYPE "public"."vehicle_media_kind" AS ENUM('photo', 'video', 'document_preview');--> statement-breakpoint
CREATE TYPE "public"."vehicle_transmission" AS ENUM('manual', 'automatic', 'automated', 'cvt', 'other');--> statement-breakpoint
CREATE TYPE "public"."vehicle_unit_status" AS ENUM('acquired', 'in_preparation', 'available', 'reserved', 'sold', 'delivered', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."vehicle_checklist_status" AS ENUM('pending', 'in_progress', 'passed', 'failed', 'waived');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status_target" AS ENUM('listing', 'unit');--> statement-breakpoint
CREATE TYPE "public"."lead_activity_direction" AS ENUM('inbound', 'outbound', 'internal');--> statement-breakpoint
CREATE TYPE "public"."lead_activity_type" AS ENUM('note', 'call', 'whatsapp', 'email', 'status_change', 'task');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('public_site', 'crm', 'external_api', 'manual', 'olx', 'whatsapp', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost', 'archived');--> statement-breakpoint
CREATE TYPE "public"."migration_run_status" AS ENUM('planned', 'running', 'succeeded', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."provider_event_status" AS ENUM('received', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."sale_payment_status" AS ENUM('pending', 'paid', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('draft', 'pending', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."custom_domain_status" AS ENUM('not_configured', 'pending', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."storefront_media_asset_kind" AS ENUM('image');--> statement-breakpoint
CREATE TYPE "public"."vehicle_catalog_sync_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."vehicle_catalog_type" AS ENUM('cars', 'motorcycles', 'trucks');--> statement-breakpoint
CREATE TABLE "vehicle_suppliers" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"display_name" varchar(191) NOT NULL,
	"document_number" varchar(32),
	"email" varchar(191),
	"external_provider_id" varchar(191),
	"kind" "vehicle_supplier_kind" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"phone" varchar(32),
	"provider" varchar(80),
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_unit_acquisitions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"acquisition_date" timestamp with time zone,
	"acquisition_price_cents" integer,
	"acquisition_user_id" uuid,
	"channel" "vehicle_acquisition_channel" NOT NULL,
	"commission_timing" "vehicle_acquisition_commission_timing" DEFAULT 'closed' NOT NULL,
	"custom_channel_label" varchar(120),
	"lead_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"source_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_id" uuid NOT NULL,
	"supplier_id" uuid,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_approvals" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_actor_id" varchar(191),
	"proposal_digest" varchar(64) NOT NULL,
	"run_id" uuid NOT NULL,
	"status" "automation_approval_status" DEFAULT 'pending' NOT NULL,
	"step_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_approvals_version_positive" CHECK ("automation_approvals"."version" > 0),
	CONSTRAINT "automation_approvals_proposal_digest_sha256" CHECK ("automation_approvals"."proposal_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "automation_approvals_decision_actor_consistent" CHECK ((
        ("automation_approvals"."status" = 'pending' AND "automation_approvals"."decided_at" IS NULL AND "automation_approvals"."decided_by_actor_id" IS NULL)
        OR
        ("automation_approvals"."status" <> 'pending' AND "automation_approvals"."decided_at" IS NOT NULL AND "automation_approvals"."decided_by_actor_id" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_actor_id" varchar(191) NOT NULL,
	"execution_enabled" boolean DEFAULT false NOT NULL,
	"objective" text NOT NULL,
	"status" "automation_run_status" DEFAULT 'awaiting_approval' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_runs_execution_disabled" CHECK ("automation_runs"."execution_enabled" = false),
	CONSTRAINT "automation_runs_version_positive" CHECK ("automation_runs"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "automation_steps" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"execution_enabled" boolean DEFAULT false NOT NULL,
	"kind" "automation_step_kind" DEFAULT 'read_only_preview' NOT NULL,
	"position" integer NOT NULL,
	"risk" "automation_risk_level" DEFAULT 'low' NOT NULL,
	"run_id" uuid NOT NULL,
	"status" "automation_step_status" DEFAULT 'awaiting_approval' NOT NULL,
	"store_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(191) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_steps_execution_disabled" CHECK ("automation_steps"."execution_enabled" = false),
	CONSTRAINT "automation_steps_position_positive" CHECK ("automation_steps"."position" > 0),
	CONSTRAINT "automation_steps_version_positive" CHECK ("automation_steps"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_links" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" varchar(80) DEFAULT 'asaas' NOT NULL,
	"provider_link_id" varchar(191),
	"status" "payment_link_status" DEFAULT 'draft' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fee_amount_cents" integer DEFAULT 0 NOT NULL,
	"gross_amount_cents" integer NOT NULL,
	"hold_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"net_amount_cents" integer NOT NULL,
	"payment_link_id" uuid,
	"released_at" timestamp with time zone,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"catalog_version" varchar(80) DEFAULT '2026-07-v1' NOT NULL,
	"code" varchar(80) NOT NULL,
	"feature_key" varchar(80) NOT NULL,
	"included_in_trial" boolean DEFAULT false NOT NULL,
	"monthly_price_cents" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "billing_catalog_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_customers" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_number" varchar(32),
	"email" varchar(254),
	"name" varchar(191) NOT NULL,
	"provider" varchar(80) DEFAULT 'asaas' NOT NULL,
	"provider_customer_id" varchar(191) NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_at" timestamp with time zone,
	"external_reference" varchar(191),
	"invoice_url" text,
	"paid_at" timestamp with time zone,
	"provider" varchar(80) DEFAULT 'asaas' NOT NULL,
	"provider_payment_id" varchar(191),
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid,
	"subscription_id" uuid,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_features" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"feature_key" varchar(80) NOT NULL,
	"included" integer DEFAULT 1 NOT NULL,
	"included_in_trial" boolean DEFAULT false NOT NULL,
	"limit_value" integer,
	"plan_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"catalog_version" varchar(80) DEFAULT '2026-07-v1' NOT NULL,
	"code" varchar(80) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"monthly_price_cents" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "billing_catalog_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_items" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"addon_id" uuid,
	"ends_at" timestamp with time zone,
	"item_type" "subscription_item_type" NOT NULL,
	"plan_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone,
	"store_id" uuid,
	"subscription_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_amount_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"billing_customer_id" uuid NOT NULL,
	"current_period_end" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"provider" varchar(80) DEFAULT 'asaas' NOT NULL,
	"provider_subscription_id" varchar(191),
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_checkout_sessions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"callback_urls" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checkout_url" text NOT NULL,
	"expires_at" timestamp with time zone,
	"external_reference" varchar(200) NOT NULL,
	"provider" varchar(80) DEFAULT 'asaas' NOT NULL,
	"provider_checkout_id" varchar(191) NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "billing_checkout_status" DEFAULT 'created' NOT NULL,
	"store_id" uuid,
	"subscription_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_entitlement_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" varchar(191),
	"feature_key" varchar(80) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_status" "entitlement_status" NOT NULL,
	"previous_status" "entitlement_status",
	"reason" text,
	"source" varchar(80) NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_connections" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"credentials_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"external_connection_id" varchar(191),
	"external_instance_id" varchar(191),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"phone" varchar(40),
	"provider" "crm_connection_provider" NOT NULL,
	"status" "crm_connection_status" DEFAULT 'sandbox' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"webhook_url" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "crm_sync_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"event_key" varchar(191) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"status" "crm_sync_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_tags" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"color" varchar(16) DEFAULT '#64748b' NOT NULL,
	"connection_id" uuid,
	"emoji" varchar(16),
	"name" varchar(80) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_pipeline_stages" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"color" varchar(16) DEFAULT '#64748b' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"lead_status" varchar(40) DEFAULT 'new' NOT NULL,
	"name" varchar(120) NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"sla_days" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "crm_pipeline_stage_status" DEFAULT 'open' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_pipelines" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"name" varchar(120) NOT NULL,
	"rotation_active" boolean DEFAULT false NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_messages" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "crm_whatsapp_channel" DEFAULT 'WHATSAPP' NOT NULL,
	"channel_message_id" varchar(191),
	"connection_id" uuid NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"direction" "crm_whatsapp_message_direction" NOT NULL,
	"external_id" varchar(191),
	"media_type" varchar(120),
	"media_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_timestamp" timestamp with time zone,
	"sender_type" "crm_whatsapp_message_sender_type" NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "crm_whatsapp_message_status" NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "crm_whatsapp_message_type" DEFAULT 'TEXT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_quick_messages" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_by_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"kind" "crm_whatsapp_quick_message_kind" DEFAULT 'TEXT' NOT NULL,
	"media_type" varchar(120),
	"media_url" text,
	"shortcut" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"storage_key" text,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_session_tags" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_sessions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_user_id" uuid,
	"buyer_chat_lid" varchar(191),
	"buyer_name" varchar(191),
	"buyer_phone" varchar(191) NOT NULL,
	"channel" "crm_whatsapp_channel" DEFAULT 'WHATSAPP' NOT NULL,
	"channel_external_id" varchar(191),
	"channel_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_session_id" varchar(191),
	"first_handled_at" timestamp with time zone,
	"fresh_lead_at" timestamp with time zone,
	"human_takeover_at" timestamp with time zone,
	"last_assigned_at" timestamp with time zone,
	"last_customer_read_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"last_message_content" text,
	"last_read_at" timestamp with time zone,
	"lead_id" uuid,
	"message_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_photo_url" text,
	"source" varchar(80),
	"status" "crm_whatsapp_session_status" DEFAULT 'ACTIVE' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_campaign_recipients" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"error_message" text,
	"initial_scheduled_message_id" uuid,
	"initial_sent_at" timestamp with time zone,
	"lead_id" uuid,
	"phone" varchar(40) NOT NULL,
	"reply_content_preview" text,
	"reply_message_id" uuid,
	"reply_received_at" timestamp with time zone,
	"secondary_scheduled_message_id" uuid,
	"secondary_sent_at" timestamp with time zone,
	"sent_message_id" uuid,
	"sequence" integer NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "crm_whatsapp_campaign_recipient_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"variables" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_campaigns" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content" text NOT NULL,
	"created_by_user_id" uuid,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"initial_tag_id" uuid,
	"interval_minutes" integer DEFAULT 1 NOT NULL,
	"media_type" varchar(120),
	"media_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" varchar(191) NOT NULL,
	"replied_count" integer DEFAULT 0 NOT NULL,
	"reply_tag_id" uuid,
	"scheduled_count" integer DEFAULT 0 NOT NULL,
	"scheduled_end_at" timestamp with time zone NOT NULL,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"secondary_content" text,
	"secondary_delay_minutes" integer DEFAULT 1 NOT NULL,
	"secondary_sent_count" integer DEFAULT 0 NOT NULL,
	"selected_connection_id" uuid,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"status" "crm_whatsapp_campaign_status" DEFAULT 'draft' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_whatsapp_scheduled_messages" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"campaign_id" uuid,
	"campaign_message_type" varchar(40),
	"campaign_recipient_key" varchar(191),
	"campaign_sequence" integer,
	"connection_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"phone" varchar(40) NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"sent_message_id" uuid,
	"session_id" uuid NOT NULL,
	"status" "crm_whatsapp_scheduled_message_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_links" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_id" uuid NOT NULL,
	"link_role" varchar(80) DEFAULT 'primary' NOT NULL,
	"store_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_type" "document_link_target" NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"clauses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"kind" "document_kind" NOT NULL,
	"store_id" uuid NOT NULL,
	"template_key" varchar(120) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(191) NOT NULL,
	"updated_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"document_id" uuid NOT NULL,
	"file_name" varchar(191) NOT NULL,
	"file_size_bytes" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mime_type" varchar(120),
	"storage_key" text NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"file_name" varchar(191) NOT NULL,
	"file_size_bytes" integer,
	"kind" "document_kind" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mime_type" varchar(120),
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"storage_key" text NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(191) NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_client_keys" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"key_hash" varchar(191) NOT NULL,
	"key_prefix" varchar(32) NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "api_clients" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(120) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "api_client_status" DEFAULT 'active' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_idempotency_keys" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"idempotency_key" varchar(191) NOT NULL,
	"method" varchar(16) NOT NULL,
	"path" varchar(500) NOT NULL,
	"request_fingerprint" varchar(191) NOT NULL,
	"request_id" varchar(191) NOT NULL,
	"response_ms" integer,
	"status" "api_idempotency_status" DEFAULT 'started' NOT NULL,
	"status_code" integer,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_request_logs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid,
	"method" varchar(16) NOT NULL,
	"path" varchar(500) NOT NULL,
	"request_id" varchar(191) NOT NULL,
	"response_ms" integer,
	"status_code" integer NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_webhook_deliveries" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"event_key" varchar(191) NOT NULL,
	"last_status_code" integer,
	"next_attempt_at" timestamp with time zone,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"webhook_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_webhooks" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "api_webhook_status" DEFAULT 'active' NOT NULL,
	"store_id" uuid NOT NULL,
	"target_url" varchar(500) NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category" varchar(120) NOT NULL,
	"fixed_amount_cents" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" varchar(191) NOT NULL,
	"percentage_basis_points" integer,
	"seller_user_id" uuid,
	"status" "commission_rule_status" DEFAULT 'active' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "commission_rule_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"entry_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sale_id" uuid,
	"seller_user_id" uuid NOT NULL,
	"status" "finance_entry_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_entries" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"category" varchar(120) NOT NULL,
	"due_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" varchar(191) NOT NULL,
	"paid_at" timestamp with time zone,
	"seller_user_id" uuid,
	"status" "finance_entry_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "finance_entry_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_entry_links" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_type" "finance_link_target" NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_recurring_entries" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"category" varchar(120) NOT NULL,
	"day_of_month" integer,
	"frequency" "finance_recurrence_frequency" NOT NULL,
	"last_generated_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" varchar(191) NOT NULL,
	"next_due_at" timestamp with time zone NOT NULL,
	"seller_user_id" uuid,
	"status" "finance_entry_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "finance_entry_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financing_conditions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bank_name" varchar(120) NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"installments" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(80) NOT NULL,
	"summary" text,
	"total_amount_cents" integer
);
--> statement-breakpoint
CREATE TABLE "financing_inquiries" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"lead_id" uuid,
	"listing_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_inquiry_id" varchar(191),
	"status" varchar(80) DEFAULT 'requested' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid
);
--> statement-breakpoint
CREATE TABLE "finance_auto_entry_executions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"calculation_snapshot" jsonb NOT NULL,
	"finance_entry_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rule_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_revision" integer NOT NULL,
	"source_type" "finance_auto_entry_event" NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "finance_auto_entry_executions_source_revision_positive" CHECK ("finance_auto_entry_executions"."source_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "finance_auto_entry_rules" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"calculation" jsonb NOT NULL,
	"category" varchar(120),
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event" "finance_auto_entry_event" NOT NULL,
	"family" varchar(191),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" varchar(191),
	"output_type" "finance_entry_type" NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"recipient_kind" "finance_auto_entry_recipient_kind" DEFAULT 'event_seller' NOT NULL,
	"recipient_user_id" uuid,
	"resolution" "finance_auto_entry_rule_resolution" DEFAULT 'additive' NOT NULL,
	"rule_key" varchar(191),
	"seller_user_id" uuid,
	"status" "finance_auto_entry_rule_status" DEFAULT 'active' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"timing" jsonb NOT NULL,
	CONSTRAINT "finance_auto_entry_rules_priority_range" CHECK ("finance_auto_entry_rules"."priority" BETWEEN 0 AND 100),
	CONSTRAINT "finance_auto_entry_rules_calculation_valid" CHECK ((
        ("finance_auto_entry_rules"."calculation" ->> 'kind' = 'fixed'
          AND jsonb_typeof("finance_auto_entry_rules"."calculation" -> 'amountCents') = 'number'
          AND ("finance_auto_entry_rules"."calculation" ->> 'amountCents')::numeric
            = trunc(("finance_auto_entry_rules"."calculation" ->> 'amountCents')::numeric)
          AND ("finance_auto_entry_rules"."calculation" ->> 'amountCents')::numeric
            BETWEEN 1 AND 2147483647)
        OR
        ("finance_auto_entry_rules"."calculation" ->> 'kind' = 'percentage'
          AND jsonb_typeof("finance_auto_entry_rules"."calculation" -> 'basisPoints') = 'number'
          AND ("finance_auto_entry_rules"."calculation" ->> 'basisPoints')::numeric
            = trunc(("finance_auto_entry_rules"."calculation" ->> 'basisPoints')::numeric)
          AND ("finance_auto_entry_rules"."calculation" ->> 'basisPoints')::numeric BETWEEN 1 AND 10000
          AND "finance_auto_entry_rules"."calculation" ->> 'basis' IN (
            'sale', 'commission', 'financing', 'premium', 'insurance_commission',
            'documentation', 'consortium'
          ))
        OR
        ("finance_auto_entry_rules"."calculation" ->> 'kind' = 'rate_ppm'
          AND jsonb_typeof("finance_auto_entry_rules"."calculation" -> 'ratePpm') = 'number'
          AND ("finance_auto_entry_rules"."calculation" ->> 'ratePpm')::numeric
            = trunc(("finance_auto_entry_rules"."calculation" ->> 'ratePpm')::numeric)
          AND ("finance_auto_entry_rules"."calculation" ->> 'ratePpm')::numeric BETWEEN 1 AND 1000000
          AND "finance_auto_entry_rules"."calculation" ->> 'basis' IN (
            'sale', 'commission', 'financing', 'premium', 'insurance_commission',
            'documentation', 'consortium'
          ))
      )),
	CONSTRAINT "finance_auto_entry_rules_event_basis_valid" CHECK ((
        "finance_auto_entry_rules"."calculation" ->> 'kind' = 'fixed'
        OR ("finance_auto_entry_rules"."event" = 'vehicle_sale_closed'
          AND "finance_auto_entry_rules"."calculation" ->> 'basis' IN ('sale', 'commission'))
        OR ("finance_auto_entry_rules"."event" = 'financing_approved'
          AND "finance_auto_entry_rules"."calculation" ->> 'basis' = 'financing')
        OR ("finance_auto_entry_rules"."event" = 'insurance_issued'
          AND "finance_auto_entry_rules"."calculation" ->> 'basis' IN ('premium', 'insurance_commission'))
        OR ("finance_auto_entry_rules"."event" = 'transfer_documentation_charged'
          AND "finance_auto_entry_rules"."calculation" ->> 'basis' = 'documentation')
        OR ("finance_auto_entry_rules"."event" = 'consortium_sold'
          AND "finance_auto_entry_rules"."calculation" ->> 'basis' = 'consortium')
      )),
	CONSTRAINT "finance_auto_entry_rules_sale_output_valid" CHECK ("finance_auto_entry_rules"."event" <> 'vehicle_sale_closed' OR "finance_auto_entry_rules"."output_type" = 'commission'),
	CONSTRAINT "finance_auto_entry_rules_conditions_valid" CHECK (jsonb_typeof("finance_auto_entry_rules"."conditions") = 'object'),
	CONSTRAINT "finance_auto_entry_rules_recipient_valid" CHECK ((
        ("finance_auto_entry_rules"."recipient_kind" = 'fixed_user' AND "finance_auto_entry_rules"."recipient_user_id" IS NOT NULL)
        OR ("finance_auto_entry_rules"."recipient_kind" <> 'fixed_user' AND "finance_auto_entry_rules"."recipient_user_id" IS NULL)
      )),
	CONSTRAINT "finance_auto_entry_rules_override_family_valid" CHECK ("finance_auto_entry_rules"."resolution" <> 'seller_override' OR "finance_auto_entry_rules"."family" IS NOT NULL),
	CONSTRAINT "finance_auto_entry_rules_timing_valid" CHECK ((
        "finance_auto_entry_rules"."timing" ->> 'kind' = 'same_day'
        OR ("finance_auto_entry_rules"."timing" ->> 'kind' = 'days_after'
          AND jsonb_typeof("finance_auto_entry_rules"."timing" -> 'days') = 'number'
          AND ("finance_auto_entry_rules"."timing" ->> 'days')::integer BETWEEN 1 AND 365)
        OR ("finance_auto_entry_rules"."timing" ->> 'kind' IN ('day_of_month', 'next_month_day')
          AND jsonb_typeof("finance_auto_entry_rules"."timing" -> 'day') = 'number'
          AND ("finance_auto_entry_rules"."timing" ->> 'day')::integer BETWEEN 1 AND 31)
      ))
);
--> statement-breakpoint
CREATE TABLE "fiscal_document_links" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fiscal_document_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_type" "fiscal_link_target" NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_document_snapshots" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" varchar(191),
	"fiscal_document_id" uuid NOT NULL,
	"provider_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rendered_description" text,
	"snapshot_type" varchar(80) NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_documents" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"access_key" varchar(120),
	"document_kind" "fiscal_document_kind" DEFAULT 'nfe' NOT NULL,
	"document_type" varchar(80) NOT NULL,
	"issued_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" varchar(80) DEFAULT 'spedy' NOT NULL,
	"provider_document_id" varchar(191),
	"recipient_id" uuid,
	"status" "fiscal_document_status" DEFAULT 'draft' NOT NULL,
	"store_id" uuid NOT NULL,
	"template_id" uuid,
	"template_version" integer,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"fiscal_document_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_service_invoice_templates" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"city_service_code" varchar(80),
	"default_municipality_of_incidence" varchar(120),
	"default_service_location" varchar(120),
	"default_taxation_type" varchar(80),
	"description_template" text NOT NULL,
	"include_approximate_taxes" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default_for_recipient" boolean DEFAULT false NOT NULL,
	"name" varchar(140) NOT NULL,
	"recipient_id" uuid,
	"requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retention_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"service_municipal_code" varchar(80),
	"service_national_code" varchar(40) NOT NULL,
	"store_id" uuid NOT NULL,
	"tax_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tenant_id" uuid NOT NULL,
	"use_case" "fiscal_service_template_use_case" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_service_recipients" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_service_template_id" uuid,
	"document_number" varchar(32) NOT NULL,
	"document_type" "fiscal_recipient_document_type" NOT NULL,
	"email" varchar(191),
	"is_active" boolean DEFAULT true NOT NULL,
	"legal_name" varchar(191) NOT NULL,
	"municipal_registration" varchar(80),
	"notes" text,
	"phone" varchar(40),
	"state_registration" varchar(80),
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"trade_name" varchar(191)
);
--> statement-breakpoint
CREATE TABLE "membership_permission_overrides" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"allowed" boolean NOT NULL,
	"membership_id" uuid NOT NULL,
	"permission_key" varchar(120) NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "role_template_permissions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"permission_key" varchar(120) NOT NULL,
	"role_template_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_templates" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"name" varchar(120) NOT NULL,
	"role_key" "role_template_key" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_entitlements" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"feature_key" varchar(80) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" varchar(80) NOT NULL,
	"starts_at" timestamp with time zone,
	"status" "entitlement_status" DEFAULT 'active' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_memberships" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role_template_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"legal_name" varchar(191),
	"primary_domain" varchar(191),
	"public_slug" varchar(80) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"trading_name" varchar(191) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"legal_name" varchar(191) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"trading_name" varchar(191) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"clerk_user_id" varchar(191) NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" text,
	"tenant_id" uuid
);
--> statement-breakpoint
CREATE TABLE "identity_invitations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"clerk_invitation_id" varchar(191),
	"email" varchar(254) NOT NULL,
	"expires_at" timestamp with time zone,
	"invited_by_user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"role_template_id" uuid NOT NULL,
	"status" "identity_invitation_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admin_memberships" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role_template_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_accounts" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" varchar(80) NOT NULL,
	"status" "integration_status" DEFAULT 'inactive' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_jobs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"error_message" varchar(500),
	"job_type" varchar(120) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "integration_job_status" DEFAULT 'queued' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_catalog_mappings" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fipe_brand_code" varchar(40) NOT NULL,
	"fipe_code" varchar(40) NOT NULL,
	"fipe_model_code" varchar(40) NOT NULL,
	"fipe_year_code" varchar(40) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_brand_code" varchar(120),
	"provider_model_code" varchar(120),
	"provider_trim_code" varchar(120),
	"provider_year_code" varchar(120),
	"status" "marketplace_catalog_mapping_status" DEFAULT 'unresolved' NOT NULL,
	"unresolved_reason" text,
	"vehicle_type" varchar(40) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_provider_taxonomies" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" varchar(191) NOT NULL,
	"parent_provider_code" varchar(120),
	"provider" varchar(80) NOT NULL,
	"provider_code" varchar(120) NOT NULL,
	"taxonomy_type" varchar(80) NOT NULL,
	"vehicle_type" varchar(40)
);
--> statement-breakpoint
CREATE TABLE "vehicle_provider_listings" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"external_id" varchar(191),
	"listing_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_listings" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"asking_price_cents" integer,
	"condition" "vehicle_condition" DEFAULT 'used' NOT NULL,
	"description" text,
	"doors" integer,
	"engine_aspiration" "vehicle_engine_aspiration",
	"engine_displacement" varchar(32),
	"featured_until" timestamp with time zone,
	"fuel_type" "vehicle_fuel_type",
	"internal_notes" text,
	"is_visible_on_public_site" boolean DEFAULT false NOT NULL,
	"model_year" integer,
	"manufacture_year" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mileage_km" integer,
	"public_slug" varchar(191),
	"status" "vehicle_listing_status" DEFAULT 'draft' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(191) NOT NULL,
	"transmission" "vehicle_transmission",
	"trim_name" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "vehicle_media" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"alt_text" varchar(191),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"kind" "vehicle_media_kind" DEFAULT 'photo' NOT NULL,
	"unit_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"storage_key" text NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_plate_lookups" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"plate" varchar(16) NOT NULL,
	"provider" varchar(80) NOT NULL,
	"response_payload" jsonb NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_units" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"acquisition_date" timestamp with time zone,
	"acquisition_price_cents" integer,
	"color_name" varchar(64),
	"listing_id" uuid NOT NULL,
	"plate" varchar(16),
	"status" "vehicle_unit_status" DEFAULT 'acquired' NOT NULL,
	"stock_number" varchar(80),
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vin" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "vehicle_checklists" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by_user_id" uuid,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"name" varchar(120) NOT NULL,
	"status" "vehicle_checklist_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_costs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"cost_date" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"kind" "vehicle_cost_kind" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_price_history" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"listing_id" uuid NOT NULL,
	"new_price_cents" integer,
	"old_price_cents" integer,
	"reason" text,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_status_history" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_status" varchar(80),
	"listing_id" uuid,
	"reason" text,
	"store_id" uuid NOT NULL,
	"target" "vehicle_status_target" NOT NULL,
	"tenant_id" uuid NOT NULL,
	"to_status" varchar(80) NOT NULL,
	"unit_id" uuid
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activity_type" "lead_activity_type" NOT NULL,
	"content" text NOT NULL,
	"created_by_user_id" uuid,
	"direction" "lead_activity_direction" DEFAULT 'internal' NOT NULL,
	"idempotency_fingerprint" varchar(64),
	"idempotency_key" varchar(191),
	"lead_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_vehicle_interests" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lead_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid
);
--> statement-breakpoint
CREATE TABLE "lead_visits" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_user_id" uuid,
	"lead_id" uuid NOT NULL,
	"notes" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" varchar(80) DEFAULT 'scheduled' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"assigned_user_id" uuid,
	"buyer_email" varchar(254),
	"buyer_name" varchar(191),
	"buyer_phone" varchar(40),
	"last_interaction_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pipeline_id" uuid,
	"pipeline_stage_id" uuid,
	"source" "lead_source" NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_id_maps" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"legacy_id" varchar(120) NOT NULL,
	"migration_run_id" uuid NOT NULL,
	"source_table" varchar(120) NOT NULL,
	"target_id" uuid NOT NULL,
	"target_table" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_runs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"dump_label" varchar(191) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"status" "migration_run_status" DEFAULT 'planned' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connection_id" uuid,
	"environment" varchar(80) NOT NULL,
	"error_message" text,
	"event_type" varchar(120) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"provider" varchar(80) NOT NULL,
	"provider_event_id" varchar(191) NOT NULL,
	"status" "provider_event_status" DEFAULT 'received' NOT NULL,
	"store_id" uuid,
	"tenant_id" uuid
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"item_type" varchar(80) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sale_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_payments" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_at" timestamp with time zone,
	"extra_cents" integer DEFAULT 0 NOT NULL,
	"installments" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"method" varchar(80) NOT NULL,
	"principal_cents" integer DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"provider_payment_id" varchar(191),
	"sale_id" uuid NOT NULL,
	"status" "sale_payment_status" DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"buyer_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"closed_at" timestamp with time zone,
	"correction_of_sale_id" uuid,
	"document_policy_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_current_revision" boolean DEFAULT true NOT NULL,
	"lead_id" uuid,
	"listing_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"override_reason" text,
	"override_required_fields" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"sale_price_cents" integer,
	"sale_source_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"selected_document_kinds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seller_user_id" uuid,
	"status" "sale_status" DEFAULT 'draft' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"unit_id" uuid
);
--> statement-breakpoint
CREATE TABLE "store_custom_pages" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"accent_color" varchar(16),
	"background_color" varchar(16),
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"font_family" varchar(120),
	"is_published" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mode" varchar(32) DEFAULT 'modular' NOT NULL,
	"page_background" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"page_chrome" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secret_token" varchar(120) NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"slug" varchar(80) NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_profiles" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"address_city" varchar(120),
	"address_line_1" varchar(191),
	"address_line_2" varchar(191),
	"address_state" varchar(80),
	"address_zip_code" varchar(32),
	"business_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_email" varchar(254),
	"contact_phone" varchar(40),
	"document_number" varchar(32),
	"logo_image_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"whatsapp_phone" varchar(40)
);
--> statement-breakpoint
CREATE TABLE "store_public_site_settings" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"custom_domain" varchar(191),
	"custom_domain_status" "custom_domain_status" DEFAULT 'not_configured' NOT NULL,
	"hero_image_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"layout_key" varchar(80) DEFAULT 'default' NOT NULL,
	"seo_description" text,
	"seo_title" varchar(191),
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"last_dns_check_at" timestamp with time zone,
	"verification_token" varchar(120)
);
--> statement-breakpoint
CREATE TABLE "storefront_media_assets" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"content_type" varchar(120) NOT NULL,
	"file_name" varchar(191) NOT NULL,
	"height" integer,
	"kind" "storefront_media_asset_kind" DEFAULT 'image' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"public_url" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"width" integer
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_brands" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fipe_code" varchar(40) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"logo_url" varchar(500),
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"vehicle_type" "vehicle_catalog_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_model_families" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brand_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"name" varchar(160) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"vehicle_type" "vehicle_catalog_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_price_history" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fipe_code" varchar(40) NOT NULL,
	"fipe_year_code" varchar(40) NOT NULL,
	"last_seen_at" timestamp with time zone,
	"price_cents" integer,
	"price_label" varchar(80),
	"provider" varchar(40) NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reference_code" varchar(40) NOT NULL,
	"reference_month" varchar(80) NOT NULL,
	"vehicle_type" "vehicle_catalog_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_raw_responses" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brand_code" varchar(40),
	"endpoint" varchar(80) NOT NULL,
	"fipe_code" varchar(40),
	"fetched_at" timestamp with time zone NOT NULL,
	"http_status" integer NOT NULL,
	"model_code" varchar(40),
	"payload" jsonb NOT NULL,
	"provider" varchar(40) NOT NULL,
	"reference_code" varchar(40),
	"request_key" varchar(500) NOT NULL,
	"request_path" varchar(500) NOT NULL,
	"sync_run_id" uuid,
	"vehicle_type" "vehicle_catalog_type",
	"year_code" varchar(40)
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_references" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" varchar(40) NOT NULL,
	"is_latest" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"month" varchar(80) NOT NULL,
	"provider" varchar(40) NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_sync_runs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brands_seen" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"finished_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_families_seen" integer DEFAULT 0 NOT NULL,
	"provider" varchar(40) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"status" "vehicle_catalog_sync_status" NOT NULL,
	"vehicle_type" "vehicle_catalog_type" NOT NULL,
	"versions_seen" integer DEFAULT 0 NOT NULL,
	"years_seen" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_versions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brand_id" uuid NOT NULL,
	"fipe_code" varchar(40) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"model_family_id" uuid NOT NULL,
	"name" varchar(191) NOT NULL,
	"provider_name" varchar(191),
	"slug" varchar(191) NOT NULL,
	"vehicle_type" "vehicle_catalog_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_catalog_years" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fipe_code" varchar(40),
	"fipe_year_code" varchar(40) NOT NULL,
	"fuel" varchar(80),
	"fuel_code" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"model_year" integer,
	"name" varchar(120) NOT NULL,
	"price_cents" integer,
	"reference_month" varchar(80),
	"version_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_suppliers" ADD CONSTRAINT "vehicle_suppliers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_suppliers" ADD CONSTRAINT "vehicle_suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_unit_acquisitions" ADD CONSTRAINT "vehicle_unit_acquisitions_acquisition_user_id_users_id_fk" FOREIGN KEY ("acquisition_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_unit_acquisitions" ADD CONSTRAINT "vehicle_unit_acquisitions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_unit_acquisitions" ADD CONSTRAINT "vehicle_unit_acquisitions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_unit_acquisitions" ADD CONSTRAINT "vehicle_unit_acquisitions_supplier_id_vehicle_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."vehicle_suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_unit_acquisitions" ADD CONSTRAINT "vehicle_unit_acquisitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_unit_acquisitions" ADD CONSTRAINT "vehicle_unit_acquisitions_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_runs_id_scope_unique" ON "automation_runs" USING btree ("id","tenant_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_steps_id_run_scope_unique" ON "automation_steps" USING btree ("id","run_id","tenant_id","store_id");--> statement-breakpoint
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_step_run_scope_fk" FOREIGN KEY ("step_id","run_id","tenant_id","store_id") REFERENCES "public"."automation_steps"("id","run_id","tenant_id","store_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_run_scope_fk" FOREIGN KEY ("run_id","tenant_id","store_id") REFERENCES "public"."automation_runs"("id","tenant_id","store_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payment_link_id_payment_links_id_fk" FOREIGN KEY ("payment_link_id") REFERENCES "public"."payment_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billing_customer_id_billing_customers_id_fk" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_entitlement_events" ADD CONSTRAINT "store_entitlement_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_entitlement_events" ADD CONSTRAINT "store_entitlement_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_events" ADD CONSTRAINT "crm_sync_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_events" ADD CONSTRAINT "crm_sync_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_connection_id_crm_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD CONSTRAINT "crm_whatsapp_messages_connection_id_crm_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD CONSTRAINT "crm_whatsapp_messages_session_id_crm_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."crm_whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD CONSTRAINT "crm_whatsapp_messages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_messages" ADD CONSTRAINT "crm_whatsapp_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_quick_messages" ADD CONSTRAINT "crm_whatsapp_quick_messages_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_quick_messages" ADD CONSTRAINT "crm_whatsapp_quick_messages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_quick_messages" ADD CONSTRAINT "crm_whatsapp_quick_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_session_tags" ADD CONSTRAINT "crm_whatsapp_session_tags_session_id_crm_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."crm_whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_session_tags" ADD CONSTRAINT "crm_whatsapp_session_tags_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_session_tags" ADD CONSTRAINT "crm_whatsapp_session_tags_tag_id_crm_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."crm_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_session_tags" ADD CONSTRAINT "crm_whatsapp_session_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_connection_id_crm_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_sessions" ADD CONSTRAINT "crm_whatsapp_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_campaign_id_crm_whatsapp_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crm_whatsapp_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_connection_id_crm_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_session_id_crm_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."crm_whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaign_recipients" ADD CONSTRAINT "crm_whatsapp_campaign_recipients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_initial_tag_id_crm_tags_id_fk" FOREIGN KEY ("initial_tag_id") REFERENCES "public"."crm_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_reply_tag_id_crm_tags_id_fk" FOREIGN KEY ("reply_tag_id") REFERENCES "public"."crm_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_selected_connection_id_crm_connections_id_fk" FOREIGN KEY ("selected_connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_campaigns" ADD CONSTRAINT "crm_whatsapp_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_campaign_id_crm_whatsapp_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crm_whatsapp_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_connection_id_crm_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."crm_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_sent_message_id_crm_whatsapp_messages_id_fk" FOREIGN KEY ("sent_message_id") REFERENCES "public"."crm_whatsapp_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_session_id_crm_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."crm_whatsapp_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_whatsapp_scheduled_messages" ADD CONSTRAINT "crm_whatsapp_scheduled_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_client_keys" ADD CONSTRAINT "api_client_keys_client_id_api_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."api_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_clients" ADD CONSTRAINT "api_clients_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_clients" ADD CONSTRAINT "api_clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_idempotency_keys" ADD CONSTRAINT "api_idempotency_keys_client_id_api_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."api_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_idempotency_keys" ADD CONSTRAINT "api_idempotency_keys_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_idempotency_keys" ADD CONSTRAINT "api_idempotency_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_client_id_api_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."api_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_webhook_deliveries" ADD CONSTRAINT "api_webhook_deliveries_webhook_id_api_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."api_webhooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_webhooks" ADD CONSTRAINT "api_webhooks_client_id_api_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."api_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_webhooks" ADD CONSTRAINT "api_webhooks_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_webhooks" ADD CONSTRAINT "api_webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_entry_id_finance_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."finance_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entry_links" ADD CONSTRAINT "finance_entry_links_entry_id_finance_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."finance_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entry_links" ADD CONSTRAINT "finance_entry_links_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entry_links" ADD CONSTRAINT "finance_entry_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recurring_entries" ADD CONSTRAINT "finance_recurring_entries_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recurring_entries" ADD CONSTRAINT "finance_recurring_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recurring_entries" ADD CONSTRAINT "finance_recurring_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_conditions" ADD CONSTRAINT "financing_conditions_inquiry_id_financing_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."financing_inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_inquiries" ADD CONSTRAINT "financing_inquiries_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_executions" ADD CONSTRAINT "finance_auto_entry_executions_finance_entry_id_finance_entries_id_fk" FOREIGN KEY ("finance_entry_id") REFERENCES "public"."finance_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_executions" ADD CONSTRAINT "finance_auto_entry_executions_rule_id_finance_auto_entry_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."finance_auto_entry_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_executions" ADD CONSTRAINT "finance_auto_entry_executions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_executions" ADD CONSTRAINT "finance_auto_entry_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_rules" ADD CONSTRAINT "finance_auto_entry_rules_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_rules" ADD CONSTRAINT "finance_auto_entry_rules_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_rules" ADD CONSTRAINT "finance_auto_entry_rules_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_auto_entry_rules" ADD CONSTRAINT "finance_auto_entry_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_links" ADD CONSTRAINT "fiscal_document_links_fiscal_document_id_fiscal_documents_id_fk" FOREIGN KEY ("fiscal_document_id") REFERENCES "public"."fiscal_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_links" ADD CONSTRAINT "fiscal_document_links_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_links" ADD CONSTRAINT "fiscal_document_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_snapshots" ADD CONSTRAINT "fiscal_document_snapshots_fiscal_document_id_fiscal_documents_id_fk" FOREIGN KEY ("fiscal_document_id") REFERENCES "public"."fiscal_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_snapshots" ADD CONSTRAINT "fiscal_document_snapshots_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_document_snapshots" ADD CONSTRAINT "fiscal_document_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_recipient_id_fiscal_service_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."fiscal_service_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_template_id_fiscal_service_invoice_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."fiscal_service_invoice_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_events" ADD CONSTRAINT "fiscal_events_fiscal_document_id_fiscal_documents_id_fk" FOREIGN KEY ("fiscal_document_id") REFERENCES "public"."fiscal_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_events" ADD CONSTRAINT "fiscal_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_events" ADD CONSTRAINT "fiscal_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_service_invoice_templates" ADD CONSTRAINT "fiscal_service_invoice_templates_recipient_id_fiscal_service_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."fiscal_service_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_service_invoice_templates" ADD CONSTRAINT "fiscal_service_invoice_templates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_service_invoice_templates" ADD CONSTRAINT "fiscal_service_invoice_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_service_recipients" ADD CONSTRAINT "fiscal_service_recipients_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_service_recipients" ADD CONSTRAINT "fiscal_service_recipients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permission_overrides" ADD CONSTRAINT "membership_permission_overrides_membership_id_store_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."store_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_template_permissions" ADD CONSTRAINT "role_template_permissions_role_template_id_role_templates_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_entitlements" ADD CONSTRAINT "store_entitlements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_entitlements" ADD CONSTRAINT "store_entitlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_role_template_id_role_templates_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_invitations" ADD CONSTRAINT "identity_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_invitations" ADD CONSTRAINT "identity_invitations_role_template_id_role_templates_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_invitations" ADD CONSTRAINT "identity_invitations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_invitations" ADD CONSTRAINT "identity_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_memberships" ADD CONSTRAINT "platform_admin_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_role_template_id_role_templates_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_accounts" ADD CONSTRAINT "integration_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_accounts" ADD CONSTRAINT "integration_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_provider_listings" ADD CONSTRAINT "vehicle_provider_listings_account_id_integration_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_provider_listings" ADD CONSTRAINT "vehicle_provider_listings_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_provider_listings" ADD CONSTRAINT "vehicle_provider_listings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_provider_listings" ADD CONSTRAINT "vehicle_provider_listings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_listings" ADD CONSTRAINT "vehicle_listings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_listings" ADD CONSTRAINT "vehicle_listings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_media" ADD CONSTRAINT "vehicle_media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_plate_lookups" ADD CONSTRAINT "vehicle_plate_lookups_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_plate_lookups" ADD CONSTRAINT "vehicle_plate_lookups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_units" ADD CONSTRAINT "vehicle_units_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_units" ADD CONSTRAINT "vehicle_units_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_units" ADD CONSTRAINT "vehicle_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_costs" ADD CONSTRAINT "vehicle_costs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_costs" ADD CONSTRAINT "vehicle_costs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_costs" ADD CONSTRAINT "vehicle_costs_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_price_history" ADD CONSTRAINT "vehicle_price_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_price_history" ADD CONSTRAINT "vehicle_price_history_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_price_history" ADD CONSTRAINT "vehicle_price_history_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_price_history" ADD CONSTRAINT "vehicle_price_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_status_history" ADD CONSTRAINT "vehicle_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_status_history" ADD CONSTRAINT "vehicle_status_history_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_status_history" ADD CONSTRAINT "vehicle_status_history_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_status_history" ADD CONSTRAINT "vehicle_status_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_status_history" ADD CONSTRAINT "vehicle_status_history_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_vehicle_interests" ADD CONSTRAINT "lead_vehicle_interests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_vehicle_interests" ADD CONSTRAINT "lead_vehicle_interests_listing_id_vehicle_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."vehicle_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_vehicle_interests" ADD CONSTRAINT "lead_vehicle_interests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_vehicle_interests" ADD CONSTRAINT "lead_vehicle_interests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_vehicle_interests" ADD CONSTRAINT "lead_vehicle_interests_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_visits" ADD CONSTRAINT "lead_visits_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_visits" ADD CONSTRAINT "lead_visits_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_visits" ADD CONSTRAINT "lead_visits_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_visits" ADD CONSTRAINT "lead_visits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_id_maps" ADD CONSTRAINT "legacy_id_maps_migration_run_id_migration_runs_id_fk" FOREIGN KEY ("migration_run_id") REFERENCES "public"."migration_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_unit_id_vehicle_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_custom_pages" ADD CONSTRAINT "store_custom_pages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_custom_pages" ADD CONSTRAINT "store_custom_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_profiles" ADD CONSTRAINT "store_profiles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_profiles" ADD CONSTRAINT "store_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_public_site_settings" ADD CONSTRAINT "store_public_site_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_public_site_settings" ADD CONSTRAINT "store_public_site_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_media_assets" ADD CONSTRAINT "storefront_media_assets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_media_assets" ADD CONSTRAINT "storefront_media_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_catalog_model_families" ADD CONSTRAINT "vehicle_catalog_model_families_brand_id_vehicle_catalog_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_catalog_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_catalog_raw_responses" ADD CONSTRAINT "vehicle_catalog_raw_responses_sync_run_id_vehicle_catalog_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."vehicle_catalog_sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_catalog_versions" ADD CONSTRAINT "vehicle_catalog_versions_brand_id_vehicle_catalog_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_catalog_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_catalog_versions" ADD CONSTRAINT "vehicle_catalog_versions_model_family_id_vehicle_catalog_model_families_id_fk" FOREIGN KEY ("model_family_id") REFERENCES "public"."vehicle_catalog_model_families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_catalog_years" ADD CONSTRAINT "vehicle_catalog_years_version_id_vehicle_catalog_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."vehicle_catalog_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicle_suppliers_store_kind_idx" ON "vehicle_suppliers" USING btree ("store_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_suppliers_store_document_unique" ON "vehicle_suppliers" USING btree ("store_id","document_number");--> statement-breakpoint
CREATE INDEX "vehicle_unit_acquisitions_channel_idx" ON "vehicle_unit_acquisitions" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "vehicle_unit_acquisitions_lead_id_idx" ON "vehicle_unit_acquisitions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "vehicle_unit_acquisitions_store_channel_idx" ON "vehicle_unit_acquisitions" USING btree ("store_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_unit_acquisitions_unit_unique" ON "vehicle_unit_acquisitions" USING btree ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_approvals_step_unique" ON "automation_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "automation_approvals_scope_run_idx" ON "automation_approvals" USING btree ("tenant_id","store_id","run_id");--> statement-breakpoint
CREATE INDEX "automation_runs_scope_created_idx" ON "automation_runs" USING btree ("tenant_id","store_id","created_at");--> statement-breakpoint
CREATE INDEX "automation_runs_store_status_idx" ON "automation_runs" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_steps_run_position_unique" ON "automation_steps" USING btree ("run_id","position");--> statement-breakpoint
CREATE INDEX "automation_steps_scope_run_idx" ON "automation_steps" USING btree ("tenant_id","store_id","run_id");--> statement-breakpoint
CREATE INDEX "payment_links_store_status_idx" ON "payment_links" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "payment_links_tenant_id_idx" ON "payment_links" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "settlements_payment_link_id_idx" ON "settlements" USING btree ("payment_link_id");--> statement-breakpoint
CREATE INDEX "settlements_store_status_idx" ON "settlements" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "addons_status_published_idx" ON "addons" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "addons_code_catalog_version_unique" ON "addons" USING btree ("code","catalog_version");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_provider_customer_unique" ON "billing_customers" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_tenant_provider_unique" ON "billing_customers" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "payments_external_reference_idx" ON "payments" USING btree ("external_reference");--> statement-breakpoint
CREATE INDEX "payments_tenant_status_idx" ON "payments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_unique" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_features_plan_feature_unique" ON "plan_features" USING btree ("plan_id","feature_key");--> statement-breakpoint
CREATE INDEX "plans_status_published_idx" ON "plans" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_code_catalog_version_unique" ON "plans" USING btree ("code","catalog_version");--> statement-breakpoint
CREATE INDEX "subscription_items_store_id_idx" ON "subscription_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "subscription_items_subscription_id_idx" ON "subscription_items" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_status_idx" ON "subscriptions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_subscription_unique" ON "subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_tenant_status_idx" ON "billing_checkout_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_checkout_sessions_provider_checkout_unique" ON "billing_checkout_sessions" USING btree ("provider","provider_checkout_id");--> statement-breakpoint
CREATE INDEX "store_entitlement_events_store_created_idx" ON "store_entitlement_events" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "store_entitlement_events_tenant_created_idx" ON "store_entitlement_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_connections_store_status_idx" ON "crm_connections" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connections_store_provider_name_unique" ON "crm_connections" USING btree ("store_id","provider","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connections_provider_external_unique" ON "crm_connections" USING btree ("provider","external_connection_id");--> statement-breakpoint
CREATE INDEX "crm_sync_events_status_idx" ON "crm_sync_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_sync_events_event_key_unique" ON "crm_sync_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "crm_tags_store_idx" ON "crm_tags" USING btree ("store_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_tags_store_connection_name_unique" ON "crm_tags" USING btree ("store_id","connection_id","name");--> statement-breakpoint
CREATE INDEX "crm_pipeline_stages_pipeline_idx" ON "crm_pipeline_stages" USING btree ("pipeline_id","sort_order");--> statement-breakpoint
CREATE INDEX "crm_pipeline_stages_store_idx" ON "crm_pipeline_stages" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "crm_pipelines_store_default_idx" ON "crm_pipelines" USING btree ("store_id","is_default");--> statement-breakpoint
CREATE INDEX "crm_pipelines_tenant_id_idx" ON "crm_pipelines" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_pipelines_store_name_active_unique" ON "crm_pipelines" USING btree ("store_id","name") WHERE "crm_pipelines"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "crm_whatsapp_messages_session_created_idx" ON "crm_whatsapp_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_messages_session_provider_idx" ON "crm_whatsapp_messages" USING btree ("session_id","provider_timestamp");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_messages_store_created_idx" ON "crm_whatsapp_messages" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_messages_session_external_unique" ON "crm_whatsapp_messages" USING btree ("session_id","external_id");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_quick_messages_store_idx" ON "crm_whatsapp_quick_messages" USING btree ("store_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_quick_messages_store_shortcut_unique" ON "crm_whatsapp_quick_messages" USING btree ("store_id","shortcut");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_session_tags_session_idx" ON "crm_whatsapp_session_tags" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_session_tags_tag_idx" ON "crm_whatsapp_session_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_session_tags_unique" ON "crm_whatsapp_session_tags" USING btree ("session_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_sessions_connection_phone_unique" ON "crm_whatsapp_sessions" USING btree ("connection_id","buyer_phone");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_sessions_store_last_message_idx" ON "crm_whatsapp_sessions" USING btree ("store_id","last_message_at");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_sessions_store_fresh_idx" ON "crm_whatsapp_sessions" USING btree ("store_id","fresh_lead_at","first_handled_at");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_sessions_store_lead_idx" ON "crm_whatsapp_sessions" USING btree ("store_id","lead_id");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_sessions_store_status_idx" ON "crm_whatsapp_sessions" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_sessions_connection_external_unique" ON "crm_whatsapp_sessions" USING btree ("connection_id","external_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_sessions_connection_lid_unique" ON "crm_whatsapp_sessions" USING btree ("connection_id","buyer_chat_lid");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_whatsapp_campaign_recipients_campaign_session_unique" ON "crm_whatsapp_campaign_recipients" USING btree ("campaign_id","session_id");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_campaign_recipients_campaign_idx" ON "crm_whatsapp_campaign_recipients" USING btree ("campaign_id","sequence");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_campaign_recipients_session_status_idx" ON "crm_whatsapp_campaign_recipients" USING btree ("session_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_campaigns_store_status_idx" ON "crm_whatsapp_campaigns" USING btree ("store_id","status","created_at");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_campaigns_store_start_idx" ON "crm_whatsapp_campaigns" USING btree ("store_id","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_scheduled_messages_campaign_idx" ON "crm_whatsapp_scheduled_messages" USING btree ("campaign_id","campaign_sequence");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_scheduled_messages_due_idx" ON "crm_whatsapp_scheduled_messages" USING btree ("store_id","status","scheduled_at");--> statement-breakpoint
CREATE INDEX "crm_whatsapp_scheduled_messages_session_idx" ON "crm_whatsapp_scheduled_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "document_links_document_id_idx" ON "document_links" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_links_store_id_idx" ON "document_links" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "document_links_target_idx" ON "document_links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "document_links_tenant_id_idx" ON "document_links" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_links_unique" ON "document_links" USING btree ("document_id","target_type","target_id","link_role");--> statement-breakpoint
CREATE INDEX "document_templates_kind_idx" ON "document_templates" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "document_templates_store_id_idx" ON "document_templates" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "document_templates_tenant_id_idx" ON "document_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_templates_store_template_key_unique" ON "document_templates" USING btree ("store_id","template_key");--> statement-breakpoint
CREATE INDEX "document_versions_document_id_idx" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_versions_store_id_idx" ON "document_versions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "document_versions_tenant_id_idx" ON "document_versions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_number_unique" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE INDEX "documents_created_by_user_id_idx" ON "documents" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "documents_kind_idx" ON "documents" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_store_id_idx" ON "documents" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "documents_tenant_id_idx" ON "documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_client_keys_client_id_idx" ON "api_client_keys" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_client_keys_hash_unique" ON "api_client_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_clients_store_id_idx" ON "api_clients" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "api_idempotency_keys_client_id_idx" ON "api_idempotency_keys" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "api_idempotency_keys_store_created_idx" ON "api_idempotency_keys" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_idempotency_keys_client_key_unique" ON "api_idempotency_keys" USING btree ("client_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "api_request_logs_client_id_idx" ON "api_request_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "api_request_logs_store_created_idx" ON "api_request_logs" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "api_webhook_deliveries_next_attempt_idx" ON "api_webhook_deliveries" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_webhook_deliveries_event_unique" ON "api_webhook_deliveries" USING btree ("webhook_id","event_key");--> statement-breakpoint
CREATE INDEX "api_webhooks_client_id_idx" ON "api_webhooks" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "commission_rules_seller_user_id_idx" ON "commission_rules" USING btree ("seller_user_id");--> statement-breakpoint
CREATE INDEX "commission_rules_store_status_idx" ON "commission_rules" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "commissions_sale_id_idx" ON "commissions" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "commissions_seller_user_id_idx" ON "commissions" USING btree ("seller_user_id");--> statement-breakpoint
CREATE INDEX "finance_entries_due_at_idx" ON "finance_entries" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "finance_entries_seller_user_id_idx" ON "finance_entries" USING btree ("seller_user_id");--> statement-breakpoint
CREATE INDEX "finance_entries_store_status_idx" ON "finance_entries" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "finance_entries_type_idx" ON "finance_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "finance_entry_links_entry_id_idx" ON "finance_entry_links" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "finance_entry_links_target_idx" ON "finance_entry_links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "finance_recurring_entries_next_due_at_idx" ON "finance_recurring_entries" USING btree ("next_due_at");--> statement-breakpoint
CREATE INDEX "finance_recurring_entries_store_type_idx" ON "finance_recurring_entries" USING btree ("store_id","type");--> statement-breakpoint
CREATE INDEX "financing_conditions_inquiry_id_idx" ON "financing_conditions" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "financing_inquiries_lead_id_idx" ON "financing_inquiries" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "financing_inquiries_listing_id_idx" ON "financing_inquiries" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "financing_inquiries_store_status_idx" ON "financing_inquiries" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_auto_entry_executions_idempotency_unique" ON "finance_auto_entry_executions" USING btree ("store_id","rule_id","source_type","source_id","source_revision");--> statement-breakpoint
CREATE INDEX "finance_auto_entry_executions_scope_source_idx" ON "finance_auto_entry_executions" USING btree ("tenant_id","store_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "finance_auto_entry_executions_entry_idx" ON "finance_auto_entry_executions" USING btree ("finance_entry_id");--> statement-breakpoint
CREATE INDEX "finance_auto_entry_rules_scope_event_idx" ON "finance_auto_entry_rules" USING btree ("tenant_id","store_id","event","status");--> statement-breakpoint
CREATE INDEX "finance_auto_entry_rules_seller_idx" ON "finance_auto_entry_rules" USING btree ("seller_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finance_auto_entry_rules_scope_rule_key_unique" ON "finance_auto_entry_rules" USING btree ("tenant_id","store_id","rule_key",coalesce("seller_user_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "finance_auto_entry_rules"."rule_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "fiscal_document_links_document_id_idx" ON "fiscal_document_links" USING btree ("fiscal_document_id");--> statement-breakpoint
CREATE INDEX "fiscal_document_links_target_idx" ON "fiscal_document_links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "fiscal_document_snapshots_document_id_idx" ON "fiscal_document_snapshots" USING btree ("fiscal_document_id");--> statement-breakpoint
CREATE INDEX "fiscal_document_snapshots_store_id_idx" ON "fiscal_document_snapshots" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "fiscal_documents_store_status_idx" ON "fiscal_documents" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_documents_provider_document_unique" ON "fiscal_documents" USING btree ("provider","provider_document_id");--> statement-breakpoint
CREATE INDEX "fiscal_events_document_id_idx" ON "fiscal_events" USING btree ("fiscal_document_id");--> statement-breakpoint
CREATE INDEX "fiscal_events_store_id_idx" ON "fiscal_events" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "fiscal_service_invoice_templates_store_idx" ON "fiscal_service_invoice_templates" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "fiscal_service_invoice_templates_recipient_idx" ON "fiscal_service_invoice_templates" USING btree ("recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_service_invoice_templates_name_unique" ON "fiscal_service_invoice_templates" USING btree ("store_id","name","version");--> statement-breakpoint
CREATE INDEX "fiscal_service_recipients_store_idx" ON "fiscal_service_recipients" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_service_recipients_document_unique" ON "fiscal_service_recipients" USING btree ("store_id","document_number");--> statement-breakpoint
CREATE INDEX "membership_permission_overrides_membership_id_idx" ON "membership_permission_overrides" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_permission_overrides_unique" ON "membership_permission_overrides" USING btree ("membership_id","permission_key");--> statement-breakpoint
CREATE INDEX "role_template_permissions_permission_key_idx" ON "role_template_permissions" USING btree ("permission_key");--> statement-breakpoint
CREATE UNIQUE INDEX "role_template_permissions_unique" ON "role_template_permissions" USING btree ("role_template_id","permission_key");--> statement-breakpoint
CREATE UNIQUE INDEX "role_templates_role_key_unique" ON "role_templates" USING btree ("role_key");--> statement-breakpoint
CREATE INDEX "store_entitlements_feature_key_idx" ON "store_entitlements" USING btree ("feature_key");--> statement-breakpoint
CREATE INDEX "store_entitlements_store_id_idx" ON "store_entitlements" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_entitlements_store_feature_unique" ON "store_entitlements" USING btree ("store_id","feature_key");--> statement-breakpoint
CREATE INDEX "store_memberships_role_template_id_idx" ON "store_memberships" USING btree ("role_template_id");--> statement-breakpoint
CREATE INDEX "store_memberships_tenant_id_idx" ON "store_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_memberships_store_user_unique" ON "store_memberships" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE INDEX "stores_tenant_id_idx" ON "stores" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_public_slug_unique" ON "stores" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_unique" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_unique" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "identity_invitations_email_idx" ON "identity_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "identity_invitations_status_idx" ON "identity_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "identity_invitations_store_id_idx" ON "identity_invitations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "identity_invitations_tenant_id_idx" ON "identity_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_invitations_active_store_unique" ON "identity_invitations" USING btree ("tenant_id","store_id","email","role_template_id") WHERE "identity_invitations"."status" in ('pending', 'sent') and "identity_invitations"."store_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_invitations_active_tenant_unique" ON "identity_invitations" USING btree ("tenant_id","email","role_template_id") WHERE "identity_invitations"."status" in ('pending', 'sent') and "identity_invitations"."store_id" is null;--> statement-breakpoint
CREATE INDEX "platform_admin_memberships_status_idx" ON "platform_admin_memberships" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admin_memberships_user_unique" ON "platform_admin_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tenant_memberships_role_template_id_idx" ON "tenant_memberships" USING btree ("role_template_id");--> statement-breakpoint
CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_memberships_tenant_user_unique" ON "tenant_memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_accounts_store_provider_unique" ON "integration_accounts" USING btree ("store_id","provider");--> statement-breakpoint
CREATE INDEX "integration_jobs_account_id_idx" ON "integration_jobs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "integration_jobs_store_status_idx" ON "integration_jobs" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "marketplace_catalog_mappings_provider_status_idx" ON "marketplace_catalog_mappings" USING btree ("provider","status");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_catalog_mappings_provider_fipe_unique" ON "marketplace_catalog_mappings" USING btree ("provider","vehicle_type","fipe_brand_code","fipe_model_code","fipe_code","fipe_year_code");--> statement-breakpoint
CREATE INDEX "marketplace_provider_taxonomies_provider_type_idx" ON "marketplace_provider_taxonomies" USING btree ("provider","taxonomy_type");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_provider_taxonomies_provider_code_unique" ON "marketplace_provider_taxonomies" USING btree ("provider","taxonomy_type","provider_code");--> statement-breakpoint
CREATE INDEX "vehicle_provider_listings_external_id_idx" ON "vehicle_provider_listings" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_provider_listings_account_listing_unique" ON "vehicle_provider_listings" USING btree ("account_id","listing_id");--> statement-breakpoint
CREATE INDEX "vehicle_listings_status_idx" ON "vehicle_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vehicle_listings_store_status_idx" ON "vehicle_listings" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "vehicle_listings_tenant_id_idx" ON "vehicle_listings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_listings_store_slug_unique" ON "vehicle_listings" USING btree ("store_id","public_slug");--> statement-breakpoint
CREATE INDEX "vehicle_media_unit_order_idx" ON "vehicle_media" USING btree ("unit_id","display_order");--> statement-breakpoint
CREATE INDEX "vehicle_media_store_id_idx" ON "vehicle_media" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "vehicle_media_tenant_id_idx" ON "vehicle_media" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_plate_lookups_store_plate_idx" ON "vehicle_plate_lookups" USING btree ("store_id","plate");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_plate_lookups_store_provider_plate_unique" ON "vehicle_plate_lookups" USING btree ("store_id","provider","plate");--> statement-breakpoint
CREATE INDEX "vehicle_units_listing_id_idx" ON "vehicle_units" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "vehicle_units_status_idx" ON "vehicle_units" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vehicle_units_store_status_idx" ON "vehicle_units" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "vehicle_units_tenant_id_idx" ON "vehicle_units" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_store_plate_unique" ON "vehicle_units" USING btree ("store_id","plate");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_store_stock_unique" ON "vehicle_units" USING btree ("store_id","stock_number");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_units_store_vin_unique" ON "vehicle_units" USING btree ("store_id","vin");--> statement-breakpoint
CREATE INDEX "vehicle_checklists_completed_by_idx" ON "vehicle_checklists" USING btree ("completed_by_user_id");--> statement-breakpoint
CREATE INDEX "vehicle_checklists_store_id_idx" ON "vehicle_checklists" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "vehicle_checklists_tenant_id_idx" ON "vehicle_checklists" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_checklists_unit_id_idx" ON "vehicle_checklists" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "vehicle_costs_kind_idx" ON "vehicle_costs" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "vehicle_costs_store_id_idx" ON "vehicle_costs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "vehicle_costs_tenant_id_idx" ON "vehicle_costs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_costs_unit_id_idx" ON "vehicle_costs" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "vehicle_price_history_actor_user_id_idx" ON "vehicle_price_history" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "vehicle_price_history_listing_id_idx" ON "vehicle_price_history" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "vehicle_price_history_store_id_idx" ON "vehicle_price_history" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "vehicle_price_history_tenant_id_idx" ON "vehicle_price_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_status_history_listing_id_idx" ON "vehicle_status_history" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "vehicle_status_history_store_id_idx" ON "vehicle_status_history" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "vehicle_status_history_tenant_id_idx" ON "vehicle_status_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_status_history_unit_id_idx" ON "vehicle_status_history" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "lead_activities_lead_id_idx" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_activities_store_occurred_at_idx" ON "lead_activities" USING btree ("store_id","occurred_at");--> statement-breakpoint
CREATE INDEX "lead_activities_tenant_id_idx" ON "lead_activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_activities_store_idempotency_key_unique" ON "lead_activities" USING btree ("store_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "lead_vehicle_interests_listing_id_idx" ON "lead_vehicle_interests" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "lead_vehicle_interests_store_id_idx" ON "lead_vehicle_interests" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_vehicle_interests_unique" ON "lead_vehicle_interests" USING btree ("lead_id","listing_id","unit_id");--> statement-breakpoint
CREATE INDEX "lead_visits_lead_id_idx" ON "lead_visits" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_visits_scheduled_at_idx" ON "lead_visits" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "lead_visits_store_id_idx" ON "lead_visits" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "leads_assigned_user_id_idx" ON "leads" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "leads_pipeline_id_idx" ON "leads" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "leads_pipeline_stage_id_idx" ON "leads" USING btree ("pipeline_stage_id");--> statement-breakpoint
CREATE INDEX "leads_source_idx" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_store_status_idx" ON "leads" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "leads_tenant_id_idx" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_id_maps_source_unique" ON "legacy_id_maps" USING btree ("migration_run_id","source_table","legacy_id");--> statement-breakpoint
CREATE INDEX "legacy_id_maps_target_idx" ON "legacy_id_maps" USING btree ("target_table","target_id");--> statement-breakpoint
CREATE INDEX "migration_runs_status_idx" ON "migration_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_events_status_idx" ON "provider_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_events_connection_id_idx" ON "provider_events" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "provider_events_store_id_idx" ON "provider_events" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "provider_events_tenant_id_idx" ON "provider_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_provider_event_unique" ON "provider_events" USING btree ("provider","environment","provider_event_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_store_id_idx" ON "sale_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_payments_status_idx" ON "sale_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_closed_at_idx" ON "sales" USING btree ("closed_at");--> statement-breakpoint
CREATE INDEX "sales_lead_id_idx" ON "sales" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "sales_seller_user_id_idx" ON "sales" USING btree ("seller_user_id");--> statement-breakpoint
CREATE INDEX "sales_store_status_idx" ON "sales" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "sales_unit_id_idx" ON "sales" USING btree ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_current_unit_unique" ON "sales" USING btree ("unit_id") WHERE "sales"."unit_id" is not null
          and "sales"."is_current_revision" = true
          and "sales"."is_deleted" = false
          and "sales"."deleted_at" is null
          and "sales"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "store_custom_pages_store_id_idx" ON "store_custom_pages" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_custom_pages_tenant_id_idx" ON "store_custom_pages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "store_custom_pages_store_published_idx" ON "store_custom_pages" USING btree ("store_id","is_published");--> statement-breakpoint
CREATE UNIQUE INDEX "store_custom_pages_store_slug_deleted_unique" ON "store_custom_pages" USING btree ("store_id","slug") WHERE "store_custom_pages"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "store_profiles_tenant_id_idx" ON "store_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_profiles_store_id_unique" ON "store_profiles" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_public_site_settings_tenant_id_idx" ON "store_public_site_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_public_site_settings_domain_unique" ON "store_public_site_settings" USING btree ("custom_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "store_public_site_settings_store_id_unique" ON "store_public_site_settings" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "storefront_media_assets_store_id_idx" ON "storefront_media_assets" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "storefront_media_assets_tenant_id_idx" ON "storefront_media_assets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_media_assets_storage_key_unique" ON "storefront_media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_catalog_brands_type_fipe_unique" ON "vehicle_catalog_brands" USING btree ("vehicle_type","fipe_code");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_catalog_brands_type_slug_unique" ON "vehicle_catalog_brands" USING btree ("vehicle_type","slug");--> statement-breakpoint
CREATE INDEX "vehicle_catalog_model_families_brand_idx" ON "vehicle_catalog_model_families" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_catalog_model_families_brand_slug_unique" ON "vehicle_catalog_model_families" USING btree ("brand_id","slug");--> statement-breakpoint
CREATE INDEX "vehicle_catalog_price_history_fipe_idx" ON "vehicle_catalog_price_history" USING btree ("vehicle_type","fipe_code","fipe_year_code");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_catalog_price_history_reference_unique" ON "vehicle_catalog_price_history" USING btree ("provider","vehicle_type","fipe_code","fipe_year_code","reference_code");--> statement-breakpoint
CREATE INDEX "vehicle_catalog_raw_responses_request_idx" ON "vehicle_catalog_raw_responses" USING btree ("provider","request_key");--> statement-breakpoint
CREATE INDEX "vehicle_catalog_raw_responses_sync_run_idx" ON "vehicle_catalog_raw_responses" USING btree ("sync_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_catalog_references_provider_code_unique" ON "vehicle_catalog_references" USING btree ("provider","code");--> statement-breakpoint
CREATE INDEX "vehicle_catalog_versions_family_idx" ON "vehicle_catalog_versions" USING btree ("model_family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_catalog_versions_type_brand_fipe_unique" ON "vehicle_catalog_versions" USING btree ("vehicle_type","brand_id","fipe_code");--> statement-breakpoint
CREATE INDEX "vehicle_catalog_years_version_idx" ON "vehicle_catalog_years" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_catalog_years_version_code_unique" ON "vehicle_catalog_years" USING btree ("version_id","fipe_year_code");
