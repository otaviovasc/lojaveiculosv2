DO $$
DECLARE
  legacy_count bigint;
BEGIN
  IF to_regclass('public.crm_sync_events') IS NOT NULL THEN
    SELECT count(*) INTO legacy_count FROM "crm_sync_events";
    IF legacy_count > 0 THEN
      RAISE EXCEPTION
        'CRM dead-schema cleanup requires an empty crm_sync_events table (found % rows)',
        legacy_count;
    END IF;
  END IF;

  SELECT count(*) INTO legacy_count
  FROM "lead_activities"
  WHERE "activity_type"::text = 'whatsapp';
  IF legacy_count > 0 THEN
    RAISE EXCEPTION
      'CRM message-activity cutover requires no whatsapp lead activities (found % rows)',
      legacy_count;
  END IF;
END $$;--> statement-breakpoint

DROP TABLE "crm_sync_events";--> statement-breakpoint
DROP TYPE "crm_sync_status";--> statement-breakpoint
ALTER TYPE "lead_activity_type" RENAME VALUE 'whatsapp' TO 'message';
