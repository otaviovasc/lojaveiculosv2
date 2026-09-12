DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "fiscal_provider_connections" AS "connection"
    INNER JOIN "stores" AS "store" ON "store"."id" = "connection"."store_id"
    WHERE "connection"."tenant_id" IS DISTINCT FROM "store"."tenant_id"
    UNION ALL
    SELECT 1
    FROM "fiscal_service_recipients" AS "recipient"
    INNER JOIN "stores" AS "store" ON "store"."id" = "recipient"."store_id"
    WHERE "recipient"."tenant_id" IS DISTINCT FROM "store"."tenant_id"
    UNION ALL
    SELECT 1
    FROM "fiscal_service_invoice_templates" AS "template"
    INNER JOIN "stores" AS "store" ON "store"."id" = "template"."store_id"
    WHERE "template"."tenant_id" IS DISTINCT FROM "store"."tenant_id"
    UNION ALL
    SELECT 1
    FROM "fiscal_documents" AS "document"
    INNER JOIN "stores" AS "store" ON "store"."id" = "document"."store_id"
    WHERE "document"."tenant_id" IS DISTINCT FROM "store"."tenant_id"
  ) THEN
    RAISE EXCEPTION 'Fiscal root scope integrity blocked: connection, recipient, template, or document tenant differs from its store';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "fiscal_service_recipients" AS "recipient"
    LEFT JOIN "fiscal_service_invoice_templates" AS "template"
      ON "template"."id" = "recipient"."default_service_template_id"
    WHERE "recipient"."default_service_template_id" IS NOT NULL
      AND (
        "template"."id" IS NULL
        OR "template"."tenant_id" IS DISTINCT FROM "recipient"."tenant_id"
        OR "template"."store_id" IS DISTINCT FROM "recipient"."store_id"
      )
    UNION ALL
    SELECT 1
    FROM "fiscal_service_invoice_templates" AS "template"
    LEFT JOIN "fiscal_service_recipients" AS "recipient"
      ON "recipient"."id" = "template"."recipient_id"
    WHERE "template"."recipient_id" IS NOT NULL
      AND (
        "recipient"."id" IS NULL
        OR "recipient"."tenant_id" IS DISTINCT FROM "template"."tenant_id"
        OR "recipient"."store_id" IS DISTINCT FROM "template"."store_id"
      )
    UNION ALL
    SELECT 1
    FROM "fiscal_documents" AS "document"
    LEFT JOIN "fiscal_service_recipients" AS "recipient"
      ON "recipient"."id" = "document"."recipient_id"
    WHERE "document"."recipient_id" IS NOT NULL
      AND (
        "recipient"."id" IS NULL
        OR "recipient"."tenant_id" IS DISTINCT FROM "document"."tenant_id"
        OR "recipient"."store_id" IS DISTINCT FROM "document"."store_id"
      )
    UNION ALL
    SELECT 1
    FROM "fiscal_documents" AS "document"
    LEFT JOIN "fiscal_service_invoice_templates" AS "template"
      ON "template"."id" = "document"."template_id"
    WHERE "document"."template_id" IS NOT NULL
      AND (
        "template"."id" IS NULL
        OR "template"."tenant_id" IS DISTINCT FROM "document"."tenant_id"
        OR "template"."store_id" IS DISTINCT FROM "document"."store_id"
      )
  ) THEN
    RAISE EXCEPTION 'Fiscal catalog reference integrity blocked: ambiguous cross-scope recipient or template reference';
  END IF;
END $$;
--> statement-breakpoint
UPDATE "fiscal_document_snapshots" AS "snapshot"
SET
  "tenant_id" = "document"."tenant_id",
  "store_id" = "document"."store_id",
  "updated_at" = NOW()
FROM "fiscal_documents" AS "document"
WHERE "document"."id" = "snapshot"."fiscal_document_id"
  AND (
    "snapshot"."tenant_id" IS DISTINCT FROM "document"."tenant_id"
    OR "snapshot"."store_id" IS DISTINCT FROM "document"."store_id"
  );
--> statement-breakpoint
UPDATE "fiscal_events" AS "event"
SET
  "tenant_id" = "document"."tenant_id",
  "store_id" = "document"."store_id",
  "updated_at" = NOW()
FROM "fiscal_documents" AS "document"
WHERE "document"."id" = "event"."fiscal_document_id"
  AND (
    "event"."tenant_id" IS DISTINCT FROM "document"."tenant_id"
    OR "event"."store_id" IS DISTINCT FROM "document"."store_id"
  );
--> statement-breakpoint
UPDATE "fiscal_document_links" AS "link"
SET
  "tenant_id" = "document"."tenant_id",
  "store_id" = "document"."store_id",
  "updated_at" = NOW()
FROM "fiscal_documents" AS "document"
WHERE "document"."id" = "link"."fiscal_document_id"
  AND (
    "link"."tenant_id" IS DISTINCT FROM "document"."tenant_id"
    OR "link"."store_id" IS DISTINCT FROM "document"."store_id"
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_service_recipients_id_scope_unique"
ON "fiscal_service_recipients" ("id", "tenant_id", "store_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_service_invoice_templates_id_scope_unique"
ON "fiscal_service_invoice_templates" ("id", "tenant_id", "store_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_documents_id_scope_unique"
ON "fiscal_documents" ("id", "tenant_id", "store_id");
--> statement-breakpoint
ALTER TABLE "fiscal_provider_connections"
  ADD CONSTRAINT "fiscal_provider_connections_store_scope_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_service_recipients"
  ADD CONSTRAINT "fiscal_service_recipients_store_scope_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_service_invoice_templates"
  ADD CONSTRAINT "fiscal_service_invoice_templates_store_scope_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_documents"
  ADD CONSTRAINT "fiscal_documents_store_scope_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_document_snapshots"
  ADD CONSTRAINT "fiscal_document_snapshots_store_scope_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_events"
  ADD CONSTRAINT "fiscal_events_store_scope_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_document_links"
  ADD CONSTRAINT "fiscal_document_links_store_scope_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_service_recipients"
  ADD CONSTRAINT "fiscal_service_recipients_default_template_scope_fk"
  FOREIGN KEY ("default_service_template_id", "tenant_id", "store_id")
  REFERENCES "fiscal_service_invoice_templates" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_service_invoice_templates"
  ADD CONSTRAINT "fiscal_service_invoice_templates_recipient_scope_fk"
  FOREIGN KEY ("recipient_id", "tenant_id", "store_id")
  REFERENCES "fiscal_service_recipients" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_documents"
  ADD CONSTRAINT "fiscal_documents_recipient_scope_fk"
  FOREIGN KEY ("recipient_id", "tenant_id", "store_id")
  REFERENCES "fiscal_service_recipients" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_documents"
  ADD CONSTRAINT "fiscal_documents_template_scope_fk"
  FOREIGN KEY ("template_id", "tenant_id", "store_id")
  REFERENCES "fiscal_service_invoice_templates" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_document_snapshots"
  ADD CONSTRAINT "fiscal_document_snapshots_document_scope_fk"
  FOREIGN KEY ("fiscal_document_id", "tenant_id", "store_id")
  REFERENCES "fiscal_documents" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_events"
  ADD CONSTRAINT "fiscal_events_document_scope_fk"
  FOREIGN KEY ("fiscal_document_id", "tenant_id", "store_id")
  REFERENCES "fiscal_documents" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "fiscal_document_links"
  ADD CONSTRAINT "fiscal_document_links_document_scope_fk"
  FOREIGN KEY ("fiscal_document_id", "tenant_id", "store_id")
  REFERENCES "fiscal_documents" ("id", "tenant_id", "store_id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
