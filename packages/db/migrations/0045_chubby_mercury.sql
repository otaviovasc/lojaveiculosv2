-- A lead without a pipeline/stage disappears from the CRM board. Repair the
-- historical rows first, then make that state impossible for future writes.

WITH ranked_defaults AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "tenant_id", "store_id"
      ORDER BY "created_at", "id"
    ) AS "position"
  FROM "crm_pipelines"
  WHERE "is_default" = true AND "is_deleted" = false
)
UPDATE "crm_pipelines" AS "pipeline"
SET
  "is_default" = false,
  "updated_at" = now()
FROM "ranked_defaults" AS "ranked"
WHERE "pipeline"."id" = "ranked"."id" AND "ranked"."position" > 1;
--> statement-breakpoint

WITH lead_scopes AS (
  SELECT DISTINCT "tenant_id", "store_id"
  FROM "leads"
), selected_pipeline AS (
  SELECT DISTINCT ON ("scope"."tenant_id", "scope"."store_id")
    "pipeline"."id"
  FROM "lead_scopes" AS "scope"
  JOIN "crm_pipelines" AS "pipeline"
    ON "pipeline"."tenant_id" = "scope"."tenant_id"
   AND "pipeline"."store_id" = "scope"."store_id"
   AND "pipeline"."is_deleted" = false
  WHERE NOT EXISTS (
    SELECT 1
    FROM "crm_pipelines" AS "current_default"
    WHERE "current_default"."tenant_id" = "scope"."tenant_id"
      AND "current_default"."store_id" = "scope"."store_id"
      AND "current_default"."is_default" = true
      AND "current_default"."is_deleted" = false
  )
  ORDER BY
    "scope"."tenant_id",
    "scope"."store_id",
    "pipeline"."created_at",
    "pipeline"."id"
)
UPDATE "crm_pipelines" AS "pipeline"
SET
  "is_default" = true,
  "updated_at" = now()
FROM "selected_pipeline" AS "selected"
WHERE "pipeline"."id" = "selected"."id";
--> statement-breakpoint

WITH lead_scopes AS (
  SELECT DISTINCT "tenant_id", "store_id"
  FROM "leads"
)
INSERT INTO "crm_pipelines" (
  "description",
  "is_default",
  "name",
  "store_id",
  "tenant_id"
)
SELECT
  'Pipeline criada automaticamente para corrigir leads sem funil.',
  true,
  'Pipeline padrão',
  "scope"."store_id",
  "scope"."tenant_id"
FROM "lead_scopes" AS "scope"
WHERE NOT EXISTS (
  SELECT 1
  FROM "crm_pipelines" AS "pipeline"
  WHERE "pipeline"."tenant_id" = "scope"."tenant_id"
    AND "pipeline"."store_id" = "scope"."store_id"
    AND "pipeline"."is_default" = true
    AND "pipeline"."is_deleted" = false
);
--> statement-breakpoint

UPDATE "leads" AS "lead"
SET
  "pipeline_id" = (
    SELECT "pipeline"."id"
    FROM "crm_pipelines" AS "pipeline"
    WHERE "pipeline"."tenant_id" = "lead"."tenant_id"
      AND "pipeline"."store_id" = "lead"."store_id"
      AND "pipeline"."is_default" = true
      AND "pipeline"."is_deleted" = false
    ORDER BY "pipeline"."created_at", "pipeline"."id"
    LIMIT 1
  ),
  "updated_at" = now()
WHERE "lead"."pipeline_id" IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM "crm_pipelines" AS "pipeline"
     WHERE "pipeline"."id" = "lead"."pipeline_id"
       AND "pipeline"."tenant_id" = "lead"."tenant_id"
       AND "pipeline"."store_id" = "lead"."store_id"
       AND "pipeline"."is_deleted" = false
   );
--> statement-breakpoint

WITH referenced_pipelines AS (
  SELECT DISTINCT
    "pipeline"."id",
    "pipeline"."tenant_id",
    "pipeline"."store_id"
  FROM "leads" AS "lead"
  JOIN "crm_pipelines" AS "pipeline"
    ON "pipeline"."id" = "lead"."pipeline_id"
)
INSERT INTO "crm_pipeline_stages" (
  "color",
  "is_system",
  "lead_status",
  "name",
  "pipeline_id",
  "sla_days",
  "sort_order",
  "status",
  "store_id",
  "tenant_id"
)
SELECT
  '#3b82f6',
  true,
  'new',
  'Novo Lead',
  "pipeline"."id",
  1,
  0,
  'open',
  "pipeline"."store_id",
  "pipeline"."tenant_id"
FROM "referenced_pipelines" AS "pipeline"
WHERE NOT EXISTS (
  SELECT 1
  FROM "crm_pipeline_stages" AS "stage"
  WHERE "stage"."pipeline_id" = "pipeline"."id"
    AND "stage"."tenant_id" = "pipeline"."tenant_id"
    AND "stage"."store_id" = "pipeline"."store_id"
    AND "stage"."status" = 'open'
    AND "stage"."is_deleted" = false
);
--> statement-breakpoint

UPDATE "leads" AS "lead"
SET
  "pipeline_stage_id" = (
    SELECT "stage"."id"
    FROM "crm_pipeline_stages" AS "stage"
    WHERE "stage"."pipeline_id" = "lead"."pipeline_id"
      AND "stage"."tenant_id" = "lead"."tenant_id"
      AND "stage"."store_id" = "lead"."store_id"
      AND "stage"."status" = 'open'
      AND "stage"."is_deleted" = false
    ORDER BY "stage"."sort_order", "stage"."created_at", "stage"."id"
    LIMIT 1
  ),
  "updated_at" = now()
WHERE "lead"."pipeline_stage_id" IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM "crm_pipeline_stages" AS "stage"
     WHERE "stage"."id" = "lead"."pipeline_stage_id"
       AND "stage"."pipeline_id" = "lead"."pipeline_id"
       AND "stage"."tenant_id" = "lead"."tenant_id"
       AND "stage"."store_id" = "lead"."store_id"
       AND "stage"."is_deleted" = false
   );
--> statement-breakpoint

ALTER TABLE "leads" ALTER COLUMN "pipeline_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "pipeline_stage_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_pipelines_scope_default_unique"
  ON "crm_pipelines" ("tenant_id", "store_id")
  WHERE "is_default" = true AND "is_deleted" = false;
