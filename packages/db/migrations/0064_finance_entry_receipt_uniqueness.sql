CREATE TEMP TABLE "duplicate_finance_entry_receipt_links" AS
SELECT "id", "document_id"
FROM (
  SELECT
    "link"."id",
    "link"."document_id",
    ROW_NUMBER() OVER (
      PARTITION BY "link"."tenant_id", "link"."store_id", "link"."target_id"
      ORDER BY
        CASE WHEN "document"."status" IN ('archived', 'voided') THEN 1 ELSE 0 END,
        "document"."updated_at" DESC,
        "link"."id" ASC
    ) AS "receipt_rank"
  FROM "document_links" AS "link"
  INNER JOIN "documents" AS "document"
    ON "document"."id" = "link"."document_id"
  WHERE "link"."target_type" = 'finance_entry'
    AND "link"."link_role" = 'finance_entry_receipt'
) AS "ranked_receipts"
WHERE "receipt_rank" > 1;
--> statement-breakpoint
UPDATE "document_links"
SET
  "link_role" = 'finance_entry_receipt_archived_duplicate',
  "updated_at" = NOW()
WHERE "id" IN (
  SELECT "id" FROM "duplicate_finance_entry_receipt_links"
);
--> statement-breakpoint
UPDATE "documents" AS "duplicate_document"
SET
  "status" = CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM "document_links" AS "other_link"
      WHERE "other_link"."document_id" = "duplicate_document"."id"
        AND "other_link"."id" NOT IN (
          SELECT "id" FROM "duplicate_finance_entry_receipt_links"
        )
    ) THEN 'archived'::"document_status"
    ELSE "duplicate_document"."status"
  END,
  "metadata" = "duplicate_document"."metadata" || jsonb_build_object(
    'receiptUniquenessReconciliation',
    jsonb_build_object(
      'reason', 'duplicate_finance_entry_receipt',
      'storageKeyRetained', "duplicate_document"."storage_key"
    )
  ),
  "updated_at" = NOW()
WHERE "duplicate_document"."id" IN (
  SELECT "document_id" FROM "duplicate_finance_entry_receipt_links"
);
--> statement-breakpoint
DROP TABLE "duplicate_finance_entry_receipt_links";
--> statement-breakpoint
CREATE UNIQUE INDEX "document_links_finance_entry_receipt_unique"
ON "document_links" ("tenant_id", "store_id", "target_id")
WHERE "target_type" = 'finance_entry'
  AND "link_role" = 'finance_entry_receipt';
--> statement-breakpoint
CREATE INDEX "finance_entry_links_scope_entry_idx"
ON "finance_entry_links" ("tenant_id", "store_id", "entry_id");
--> statement-breakpoint
CREATE INDEX "finance_entry_links_scope_target_idx"
ON "finance_entry_links" (
  "tenant_id",
  "store_id",
  "target_type",
  "target_id",
  "entry_id"
);
