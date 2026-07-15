import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import postgres from "postgres";
import { assertSafeLocalDatabaseOperation } from "../db/local-database-safety.mjs";
import { createSeedDocumentArtifact } from "./seed-product-document-artifact.mjs";
import {
  SEED_DOCUMENT_ARTIFACT_VERSION,
  shouldRefreshSeedDocumentArtifact,
} from "./seed-product-document-pdf.mjs";
import {
  assertSeedR2WritesAllowed,
  loadLocalEnv,
  requireEnv,
} from "./storageScriptEnv.mjs";

const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const skipMissingEnv = args.has("--skip-missing-env");

loadLocalEnv();
assertSafeLocalDatabaseOperation("r2:seed:documents", ["DATABASE_URL"]);

const config = readR2Config();
if (!config) {
  console.info("R2 env absent; skipped seeded document object upload.");
  process.exit(0);
}
assertSeedR2WritesAllowed({ apply, bucketName: config.bucketName });

const client = new S3Client({
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  endpoint: config.endpoint,
  forcePathStyle: true,
  region: process.env.R2_REGION ?? "auto",
});
const db = postgres(process.env.DATABASE_URL ?? localDatabaseUrl, { max: 1 });

try {
  const documents = dedupeByStorageKey(await readSeedDocumentRows());
  const result = {
    refreshed: 0,
    skippedExisting: 0,
    uploaded: 0,
    wouldRefresh: 0,
    wouldUpload: 0,
  };

  for (const document of documents) {
    const artifact = await createSeedDocumentArtifact(document);
    const object = await readObjectState(document.storageKey);
    const refreshFixture =
      object.exists &&
      shouldRefreshSeedDocumentArtifact(object.metadata, {
        expectedSha256: artifact.sha256,
        storageKey: document.storageKey,
      });
    if (object.exists && !refreshFixture) {
      result.skippedExisting += 1;
      console.info(`exists ${document.storageKey}`);
      continue;
    }

    if (!apply) {
      if (refreshFixture) {
        result.wouldRefresh += 1;
        console.info(`would refresh fixture ${document.storageKey}`);
      } else {
        result.wouldUpload += 1;
        console.info(`would upload ${document.storageKey}`);
      }
      continue;
    }

    await uploadDocumentFixture(document, artifact);
    if (refreshFixture) {
      result.refreshed += 1;
      console.info(`refreshed fixture ${document.storageKey}`);
    } else {
      result.uploaded += 1;
      console.info(`uploaded ${document.storageKey}`);
    }
  }

  console.info(
    JSON.stringify({ apply, total: documents.length, ...result }, null, 2),
  );
  if (!apply) {
    console.info(
      "Dry run only. Re-run with --apply to upload missing objects.",
    );
  }
} finally {
  await db.end({ timeout: 5 });
  client.destroy();
}

async function readSeedDocumentRows() {
  return db`
    select *
    from (
      select
        'document' as source,
        d.id,
        d.id as "documentId",
        d.title,
        d.file_name as "fileName",
        d.mime_type as "mimeType",
        d.storage_key as "storageKey",
        d.kind::text as kind,
        d.status::text as status,
        d.uploaded_at as "issuedAt",
        d.metadata,
        s.trading_name as "storeName",
        sp.document_number as "storeDocumentNumber",
        sp.address_line_1 as "storeAddressLine",
        sp.address_city as "storeCity",
        sp.address_state as "storeState",
        sp.contact_phone as "storePhone"
      from documents d
      inner join stores s on s.id = d.store_id
      left join store_profiles sp on sp.store_id = d.store_id
      where d.storage_key like 'generated/vehicle-workflows/%'
        or d.storage_key like 'seed/documents/%'
      union all
      select
        'version' as source,
        v.id,
        v.document_id as "documentId",
        coalesce(d.title, v.file_name) as title,
        v.file_name as "fileName",
        v.mime_type as "mimeType",
        v.storage_key as "storageKey",
        d.kind::text as kind,
        d.status::text as status,
        d.uploaded_at as "issuedAt",
        coalesce(v.metadata, d.metadata, '{}'::jsonb) as metadata,
        s.trading_name as "storeName",
        sp.document_number as "storeDocumentNumber",
        sp.address_line_1 as "storeAddressLine",
        sp.address_city as "storeCity",
        sp.address_state as "storeState",
        sp.contact_phone as "storePhone"
      from document_versions v
      inner join documents d on d.id = v.document_id
      inner join stores s on s.id = d.store_id
      left join store_profiles sp on sp.store_id = d.store_id
      where v.storage_key like 'generated/vehicle-workflows/%'
        or v.storage_key like 'seed/documents/%'
    ) seeded_documents
    order by source, title, "fileName"
  `;
}

function dedupeByStorageKey(rows) {
  return Array.from(
    rows
      .filter((row) => row.mimeType === "application/pdf")
      .reduce((items, row) => {
        if (!items.has(row.storageKey)) items.set(row.storageKey, row);
        return items;
      }, new Map())
      .values(),
  );
}

async function readObjectState(storageKey) {
  try {
    const response = await client.send(
      new HeadObjectCommand({ Bucket: config.bucketName, Key: storageKey }),
    );
    return { exists: true, metadata: response.Metadata ?? {} };
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) {
      return { exists: false, metadata: {} };
    }
    throw error;
  }
}

async function uploadDocumentFixture(document, artifact) {
  await client.send(
    new PutObjectCommand({
      Body: artifact.body,
      Bucket: config.bucketName,
      ContentType: "application/pdf",
      Key: document.storageKey,
      Metadata: fixtureMetadata(document, artifact.sha256),
    }),
  );
}

function fixtureMetadata(document, artifactSha256) {
  return {
    artifactSha256,
    artifactVersion: SEED_DOCUMENT_ARTIFACT_VERSION,
    documentId: String(document.documentId),
    fixture: "local-product-seed",
    source: String(document.source),
  };
}

function readR2Config() {
  const hasAnyConfig = [
    "R2_BUCKET_NAME",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ].some((key) => Boolean(process.env[key]));
  if (!hasAnyConfig && skipMissingEnv) return null;

  return {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    endpoint: requireEnv("R2_ENDPOINT"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  };
}
