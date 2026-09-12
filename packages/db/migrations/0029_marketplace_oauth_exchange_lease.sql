ALTER TABLE "marketplace_oauth_transactions"
  ADD COLUMN "exchange_lease_expires_at" timestamp with time zone,
  ADD COLUMN "exchange_lease_owner" varchar(191),
  ADD COLUMN "exchange_token_ciphertext" text;
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" DROP CONSTRAINT "marketplace_oauth_transactions_status_valid";
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" DROP CONSTRAINT "marketplace_oauth_transactions_callback_consistent";
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" ADD CONSTRAINT "marketplace_oauth_transactions_status_valid" CHECK ("status" IN ('pending', 'received', 'exchanging', 'consumed', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" ADD CONSTRAINT "marketplace_oauth_transactions_callback_consistent" CHECK (
  ("status" IN ('received', 'exchanging') AND "callback_received_at" IS NOT NULL AND "authorization_code_ciphertext" IS NOT NULL AND "consumed_at" IS NULL)
  OR ("status" IN ('consumed', 'cancelled') AND "consumed_at" IS NOT NULL)
  OR ("status" = 'pending' AND "callback_received_at" IS NULL AND "authorization_code_ciphertext" IS NULL AND "consumed_at" IS NULL)
);
--> statement-breakpoint
ALTER TABLE "marketplace_oauth_transactions" ADD CONSTRAINT "marketplace_oauth_transactions_exchange_lease_consistent" CHECK (
  ("status" = 'exchanging' AND "exchange_lease_owner" IS NOT NULL AND "exchange_lease_expires_at" IS NOT NULL)
  OR ("status" <> 'exchanging' AND "exchange_lease_owner" IS NULL AND "exchange_lease_expires_at" IS NULL)
);
--> statement-breakpoint
DROP INDEX "crm_connections_store_provider_active_unique";
--> statement-breakpoint
-- Drizzle applies all pending migrations in one transaction. Expressing this
-- predicate with the new olx_chat enum literal would use it before commit.
CREATE UNIQUE INDEX "crm_connections_store_provider_active_unique"
  ON "crm_connections" ("store_id", "provider")
  WHERE "status" <> 'archived' AND "provider" <> 'composio_instagram';
