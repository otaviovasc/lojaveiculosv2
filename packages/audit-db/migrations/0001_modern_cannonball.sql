CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_scope_occurred_at_idx" ON "audit_events" USING btree ("tenant_id","store_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_provider_idx" ON "audit_events" USING btree ("provider_name");