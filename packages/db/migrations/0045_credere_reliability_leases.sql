ALTER TABLE "provider_oauth_transactions"
  ADD COLUMN "exchange_lease_expires_at" timestamp with time zone,
  ADD COLUMN "exchange_lease_owner" varchar(191),
  ADD COLUMN "exchange_token_ciphertext" text;
--> statement-breakpoint
ALTER TABLE "provider_oauth_transactions"
  ADD CONSTRAINT "provider_oauth_transactions_exchange_lease_consistent" CHECK (
    ("status" = 'pending' AND "exchange_lease_owner" IS NOT NULL AND "exchange_lease_expires_at" IS NOT NULL)
    OR ("exchange_lease_owner" IS NULL AND "exchange_lease_expires_at" IS NULL)
  );
--> statement-breakpoint
ALTER TABLE "financing_operation_requests"
  ADD COLUMN "lease_expires_at" timestamp with time zone;
