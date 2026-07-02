DO $$ BEGIN
  CREATE TYPE "fiscal_document_kind" AS ENUM ('nfe', 'nfse');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "fiscal_document_status" ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE "fiscal_document_status" ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE "fiscal_document_status" ADD VALUE IF NOT EXISTS 'authorized';
ALTER TYPE "fiscal_document_status" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE "fiscal_document_status" ADD VALUE IF NOT EXISTS 'error';

DO $$ BEGIN
  CREATE TYPE "fiscal_recipient_document_type" AS ENUM ('cnpj', 'cpf');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "fiscal_service_template_use_case" AS ENUM (
    'financing_commission',
    'financing_intermediation',
    'bank_marketing',
    'insurance_commission',
    'consortium_commission',
    'warranty_commission',
    'administrative_service',
    'vehicle_documentation_service',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "fiscal_service_recipients" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "address" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "default_service_template_id" uuid,
  "document_number" varchar(32) NOT NULL,
  "document_type" "fiscal_recipient_document_type" NOT NULL,
  "email" varchar(191),
  "is_active" boolean DEFAULT true NOT NULL,
  "legal_name" varchar(191) NOT NULL,
  "municipal_registration" varchar(80),
  "notes" text,
  "phone" varchar(40),
  "state_registration" varchar(80),
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "trade_name" varchar(191)
);

CREATE INDEX IF NOT EXISTS "fiscal_service_recipients_store_idx"
  ON "fiscal_service_recipients" ("store_id");

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_service_recipients_document_unique"
  ON "fiscal_service_recipients" ("store_id", "document_number");

CREATE TABLE IF NOT EXISTS "fiscal_service_invoice_templates" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "city_service_code" varchar(80),
  "default_municipality_of_incidence" varchar(120),
  "default_service_location" varchar(120),
  "default_taxation_type" varchar(80),
  "description_template" text NOT NULL,
  "include_approximate_taxes" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_default_for_recipient" boolean DEFAULT false NOT NULL,
  "name" varchar(140) NOT NULL,
  "recipient_id" uuid REFERENCES "fiscal_service_recipients"("id"),
  "requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "retention_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "service_municipal_code" varchar(80),
  "service_national_code" varchar(40) NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tax_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "use_case" "fiscal_service_template_use_case" NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "fiscal_service_invoice_templates_store_idx"
  ON "fiscal_service_invoice_templates" ("store_id");

CREATE INDEX IF NOT EXISTS "fiscal_service_invoice_templates_recipient_idx"
  ON "fiscal_service_invoice_templates" ("recipient_id");

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_service_invoice_templates_name_unique"
  ON "fiscal_service_invoice_templates" ("store_id", "name", "version");

ALTER TABLE "fiscal_documents"
  ADD COLUMN IF NOT EXISTS "document_kind" "fiscal_document_kind" DEFAULT 'nfe' NOT NULL,
  ADD COLUMN IF NOT EXISTS "recipient_id" uuid REFERENCES "fiscal_service_recipients"("id"),
  ADD COLUMN IF NOT EXISTS "template_id" uuid REFERENCES "fiscal_service_invoice_templates"("id"),
  ADD COLUMN IF NOT EXISTS "template_version" integer;

CREATE TABLE IF NOT EXISTS "fiscal_document_snapshots" (
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_id" varchar(191),
  "fiscal_document_id" uuid NOT NULL REFERENCES "fiscal_documents"("id"),
  "provider_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "rendered_description" text,
  "snapshot_type" varchar(80) NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id")
);

CREATE INDEX IF NOT EXISTS "fiscal_document_snapshots_document_id_idx"
  ON "fiscal_document_snapshots" ("fiscal_document_id");

CREATE INDEX IF NOT EXISTS "fiscal_document_snapshots_store_id_idx"
  ON "fiscal_document_snapshots" ("store_id");
