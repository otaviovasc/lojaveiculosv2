CREATE TABLE IF NOT EXISTS "store_custom_pages" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "accent_color" varchar(16),
  "background_color" varchar(16),
  "components" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "description" text,
  "display_order" integer DEFAULT 0 NOT NULL,
  "font_family" varchar(120),
  "is_published" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "mode" varchar(32) DEFAULT 'modular' NOT NULL,
  "page_background" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "page_chrome" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "secret_token" varchar(120) NOT NULL,
  "seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "slug" varchar(80) NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "title" varchar(120) NOT NULL
);

CREATE INDEX IF NOT EXISTS "store_custom_pages_store_id_idx"
  ON "store_custom_pages" ("store_id");

CREATE INDEX IF NOT EXISTS "store_custom_pages_tenant_id_idx"
  ON "store_custom_pages" ("tenant_id");

CREATE INDEX IF NOT EXISTS "store_custom_pages_store_published_idx"
  ON "store_custom_pages" ("store_id", "is_published");

CREATE UNIQUE INDEX IF NOT EXISTS "store_custom_pages_store_slug_deleted_unique"
  ON "store_custom_pages" ("store_id", "slug")
  WHERE "is_deleted" = false;
