ALTER TABLE "crm_conversation_cycles"
ADD COLUMN "push_notification_generation" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "crm_conversation_cycles"
ADD CONSTRAINT "conversation_cycles_push_notification_generation_nonnegative"
CHECK ("push_notification_generation" >= 0);
--> statement-breakpoint
CREATE TABLE "crm_push_subscriptions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subscription_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_push_preferences" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_push_notification_outbox" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"cycle_id" uuid NOT NULL,
	"dead_lettered_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"generation" integer NOT NULL,
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"last_error_code" varchar(120),
	"lease_expires_at" timestamp with time zone,
	"lease_token" uuid,
	"message_id" uuid NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_notification_id" varchar(191),
	"state" varchar(24) DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	CONSTRAINT "crm_push_notification_outbox_state_check" CHECK ("state" IN ('pending','processing','delivered','dead_letter')),
	CONSTRAINT "crm_push_notification_outbox_attempt_count_nonnegative" CHECK ("attempt_count" >= 0),
	CONSTRAINT "crm_push_notification_outbox_generation_nonnegative" CHECK ("generation" >= 0),
	CONSTRAINT "crm_push_notification_outbox_lease_state_check" CHECK (("state" = 'processing' AND "lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL) OR ("state" <> 'processing' AND "lease_token" IS NULL AND "lease_expires_at" IS NULL)),
	CONSTRAINT "crm_push_notification_outbox_delivery_state_check" CHECK ("state" <> 'delivered' OR ("delivered_at" IS NOT NULL AND "provider_notification_id" IS NOT NULL)),
	CONSTRAINT "crm_push_notification_outbox_dead_letter_state_check" CHECK ("state" <> 'dead_letter' OR "dead_lettered_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "crm_push_subscriptions"
ADD CONSTRAINT "crm_push_subscriptions_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_preferences"
ADD CONSTRAINT "crm_push_preferences_store_id_stores_id_fk"
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_preferences"
ADD CONSTRAINT "crm_push_preferences_tenant_id_tenants_id_fk"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_preferences"
ADD CONSTRAINT "crm_push_preferences_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_preferences"
ADD CONSTRAINT "crm_push_preferences_store_tenant_fk"
FOREIGN KEY ("store_id","tenant_id")
REFERENCES "public"."stores"("id","tenant_id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_preferences"
ADD CONSTRAINT "crm_push_preferences_scoped_membership_fk"
FOREIGN KEY ("tenant_id","store_id","user_id")
REFERENCES "public"."store_memberships"("tenant_id","store_id","user_id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_notification_outbox"
ADD CONSTRAINT "crm_push_notification_outbox_store_id_stores_id_fk"
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_notification_outbox"
ADD CONSTRAINT "crm_push_notification_outbox_tenant_id_tenants_id_fk"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_notification_outbox"
ADD CONSTRAINT "crm_push_notification_outbox_store_tenant_fk"
FOREIGN KEY ("store_id","tenant_id")
REFERENCES "public"."stores"("id","tenant_id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_notification_outbox"
ADD CONSTRAINT "crm_push_notification_outbox_scoped_thread_fk"
FOREIGN KEY ("tenant_id","store_id","thread_id")
REFERENCES "public"."crm_conversation_threads"("tenant_id","store_id","id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_notification_outbox"
ADD CONSTRAINT "crm_push_notification_outbox_semantic_cycle_fk"
FOREIGN KEY ("tenant_id","store_id","cycle_id","thread_id")
REFERENCES "public"."crm_conversation_cycles"("tenant_id","store_id","id","thread_id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_push_notification_outbox"
ADD CONSTRAINT "crm_push_notification_outbox_semantic_message_fk"
FOREIGN KEY ("tenant_id","store_id","message_id","cycle_id","thread_id")
REFERENCES "public"."crm_messages"("tenant_id","store_id","id","cycle_id","thread_id")
ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_push_subscriptions_subscription_id_unique"
ON "crm_push_subscriptions" USING btree ("subscription_id");
--> statement-breakpoint
CREATE INDEX "crm_push_subscriptions_user_enabled_idx"
ON "crm_push_subscriptions" USING btree ("user_id","enabled");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_push_preferences_scope_user_unique"
ON "crm_push_preferences" USING btree ("tenant_id","store_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_push_notification_outbox_cycle_generation_unique"
ON "crm_push_notification_outbox" USING btree ("tenant_id","store_id","cycle_id","generation");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_push_notification_outbox_idempotency_key_unique"
ON "crm_push_notification_outbox" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "crm_push_notification_outbox_claim_idx"
ON "crm_push_notification_outbox" USING btree ("state","next_attempt_at","lease_expires_at");
