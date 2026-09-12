CREATE TABLE "contact_identity_candidates" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_identity_candidates" ADD CONSTRAINT "contact_identity_candidates_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identity_candidates" ADD CONSTRAINT "contact_identity_candidates_identity_id_contact_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."contact_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identity_candidates" ADD CONSTRAINT "contact_identity_candidates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identity_candidates" ADD CONSTRAINT "contact_identity_candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identity_candidates" ADD CONSTRAINT "contact_identity_candidates_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identity_candidates" ADD CONSTRAINT "contact_identity_candidates_scoped_identity_fk" FOREIGN KEY ("tenant_id","store_id","identity_id") REFERENCES "public"."contact_identities"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identity_candidates" ADD CONSTRAINT "contact_identity_candidates_scoped_contact_fk" FOREIGN KEY ("tenant_id","store_id","contact_id") REFERENCES "public"."contacts"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_identity_candidates_scope_id_unique" ON "contact_identity_candidates" USING btree ("tenant_id","store_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_identity_candidates_identity_contact_unique" ON "contact_identity_candidates" USING btree ("tenant_id","store_id","identity_id","contact_id");--> statement-breakpoint
CREATE INDEX "contact_identity_candidates_contact_idx" ON "contact_identity_candidates" USING btree ("store_id","contact_id");
