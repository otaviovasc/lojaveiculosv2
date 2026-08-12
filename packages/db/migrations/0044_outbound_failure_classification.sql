ALTER TYPE "public"."crm_whatsapp_outbound_intent_status" ADD VALUE IF NOT EXISTS 'failed' BEFORE 'indeterminate';--> statement-breakpoint
ALTER TYPE "public"."crm_whatsapp_outbound_intent_status" ADD VALUE IF NOT EXISTS 'retryable_failed' BEFORE 'indeterminate';
