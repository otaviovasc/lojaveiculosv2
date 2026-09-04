ALTER TABLE "financing_operation_requests" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD COLUMN "exchange_lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD COLUMN "exchange_lease_owner" varchar(191);--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD COLUMN "exchange_token_ciphertext" text;--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions" ADD CONSTRAINT "provider_oauth_transactions_exchange_lease_consistent" CHECK ((
        ("provider_oauth_transactions"."status" = 'pending' AND "provider_oauth_transactions"."exchange_lease_owner" IS NOT NULL AND "provider_oauth_transactions"."exchange_lease_expires_at" IS NOT NULL)
        OR
        ("provider_oauth_transactions"."exchange_lease_owner" IS NULL AND "provider_oauth_transactions"."exchange_lease_expires_at" IS NULL)
      ));