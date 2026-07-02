DO $$
BEGIN
  CREATE TYPE "storefront_media_asset_kind" AS ENUM ('image');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "storefront_media_assets" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "content_type" varchar(120) NOT NULL,
  "file_name" varchar(191) NOT NULL,
  "height" integer,
  "kind" "storefront_media_asset_kind" DEFAULT 'image' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "public_url" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "storage_key" text NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "width" integer
);

CREATE INDEX IF NOT EXISTS "storefront_media_assets_store_id_idx"
  ON "storefront_media_assets" ("store_id");

CREATE INDEX IF NOT EXISTS "storefront_media_assets_tenant_id_idx"
  ON "storefront_media_assets" ("tenant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_media_assets_storage_key_unique"
  ON "storefront_media_assets" ("storage_key");
