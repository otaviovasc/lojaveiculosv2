CREATE TABLE "marketplace_oauth_transactions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"authorization_code_ciphertext" text,
	"callback_received_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"provider" varchar(80) NOT NULL,
	"redirect_uri" varchar(500) NOT NULL,
	"request_id" varchar(191) NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"state_hash" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "marketplace_oauth_transactions_state_hash_sha256" CHECK ("marketplace_oauth_transactions"."state_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "marketplace_oauth_transactions_status_valid" CHECK ("marketplace_oauth_transactions"."status" IN ('pending', 'received', 'consumed', 'cancelled')),
	CONSTRAINT "marketplace_oauth_transactions_callback_consistent" CHECK (
		("marketplace_oauth_transactions"."status" = 'received' AND "marketplace_oauth_transactions"."callback_received_at" IS NOT NULL AND "marketplace_oauth_transactions"."authorization_code_ciphertext" IS NOT NULL AND "marketplace_oauth_transactions"."consumed_at" IS NULL)
		OR ("marketplace_oauth_transactions"."status" IN ('consumed', 'cancelled') AND "marketplace_oauth_transactions"."consumed_at" IS NOT NULL)
		OR ("marketplace_oauth_transactions"."status" = 'pending' AND "marketplace_oauth_transactions"."callback_received_at" IS NULL AND "marketplace_oauth_transactions"."authorization_code_ciphertext" IS NULL AND "marketplace_oauth_transactions"."consumed_at" IS NULL)
	),
	CONSTRAINT "marketplace_oauth_transactions_ttl_valid" CHECK ("marketplace_oauth_transactions"."expires_at" > "marketplace_oauth_transactions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" ADD CONSTRAINT "marketplace_oauth_transactions_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" ADD CONSTRAINT "marketplace_oauth_transactions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" ADD CONSTRAINT "marketplace_oauth_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" ADD CONSTRAINT "marketplace_oauth_transactions_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_oauth_transactions_state_hash_unique" ON "marketplace_oauth_transactions" USING btree ("state_hash");
--> statement-breakpoint
CREATE INDEX "marketplace_oauth_transactions_scope_status_idx" ON "marketplace_oauth_transactions" USING btree ("tenant_id","store_id","status","expires_at");
