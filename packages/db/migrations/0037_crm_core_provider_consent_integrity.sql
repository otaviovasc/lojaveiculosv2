ALTER TABLE "integration_events" DROP CONSTRAINT "integration_events_scoped_connection_fk";
--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" DROP CONSTRAINT "crm_external_bot_event_outbox_connection_fk";
--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" ALTER COLUMN "provider" SET DATA TYPE "public"."transport_provider" USING "provider"::"public"."transport_provider";--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD COLUMN "identity_id" uuid;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD COLUMN "policy_version" varchar(80);--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD COLUMN "source" "acquisition_source";--> statement-breakpoint
CREATE UNIQUE INDEX "contact_identities_contact_id_unique" ON "contact_identities" USING btree ("tenant_id","store_id","id","contact_id");--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "consent_receipts"
    WHERE "policy_version" IS NULL OR "source" IS NULL
  ) THEN
    RAISE EXCEPTION 'consent_receipts requires explicit policy_version and source before 0037 can continue';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "consent_receipts" ALTER COLUMN "policy_version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_receipts" ALTER COLUMN "source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_semantic_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id","provider") REFERENCES "public"."provider_connections"("tenant_id","store_id","id","provider") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "integration_events" VALIDATE CONSTRAINT "integration_events_semantic_connection_fk";--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" ADD CONSTRAINT "crm_external_bot_event_outbox_semantic_connection_fk" FOREIGN KEY ("tenant_id","store_id","provider_connection_id","provider") REFERENCES "public"."provider_connections"("tenant_id","store_id","id","provider") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "crm_external_bot_event_outbox" VALIDATE CONSTRAINT "crm_external_bot_event_outbox_semantic_connection_fk";--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_identity_id_contact_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."contact_identities"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "consent_receipts" VALIDATE CONSTRAINT "consent_receipts_identity_id_contact_identities_id_fk";--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_semantic_identity_fk" FOREIGN KEY ("tenant_id","store_id","identity_id","contact_id") REFERENCES "public"."contact_identities"("tenant_id","store_id","id","contact_id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "consent_receipts" VALIDATE CONSTRAINT "consent_receipts_semantic_identity_fk";--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_supported_triple_check" CHECK (("provider_connections"."channel" = 'whatsapp' AND "provider_connections"."provider" = 'meta_cloud' AND "provider_connections"."broker" = 'composio') OR ("provider_connections"."channel" = 'instagram' AND "provider_connections"."provider" = 'meta_cloud' AND "provider_connections"."broker" = 'composio') OR ("provider_connections"."channel" = 'whatsapp' AND "provider_connections"."provider" = 'zapi' AND "provider_connections"."broker" = 'direct') OR ("provider_connections"."channel" = 'olx_chat' AND "provider_connections"."provider" = 'olx' AND "provider_connections"."broker" = 'direct')) NOT VALID;--> statement-breakpoint
ALTER TABLE "provider_connections" VALIDATE CONSTRAINT "provider_connections_supported_triple_check";
