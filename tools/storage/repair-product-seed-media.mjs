import postgres from "postgres";
import { assertSafeLocalDatabaseOperation } from "../db/local-database-safety.mjs";
import {
  createSeedMediaObjectStore,
  isExpectedSeedMediaObject,
} from "./product-seed-media-object-store.mjs";
import {
  readSeedDocumentObjectSizes,
  reconcileSeedMediaPlaceholders,
  updateSeedAssetRecords,
} from "./repair-product-seed-records.mjs";
import {
  createSeedMediaPlaceholder,
  isCurrentSeedMediaPlaceholder,
} from "./seed-product-media-placeholder.mjs";
import {
  assertSeedR2WritesAllowed,
  loadLocalEnv,
  requireEnv,
} from "./storageScriptEnv.mjs";

const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const failOnMissing = args.has("--fail-on-missing");
const skipMissingEnv = args.has("--skip-missing-env");

loadLocalEnv();
assertSafeLocalDatabaseOperation("r2:repair:seed-media", ["DATABASE_URL"]);

const config = readR2Config();
if (!config) {
  console.info("R2 env absent; skipped seeded vehicle media object repair.");
  process.exit(0);
}
assertSeedR2WritesAllowed({ apply, bucketName: config.bucketName });

const db = postgres(process.env.DATABASE_URL ?? localDatabaseUrl, { max: 1 });
const objects = createSeedMediaObjectStore(config);

try {
  const media = await readSeedMediaRows();
  const placeholders = [];
  const resolutions = [];
  const result = {
    copied: 0,
    databaseDocumentSizesUpdated: 0,
    databasePlaceholderRowsUpdated: 0,
    databaseUrlsUpdated: 0,
    generatedPlaceholders: 0,
    invalidExisting: 0,
    reusedPlaceholders: 0,
    skippedExisting: 0,
    wouldCopy: 0,
    wouldGeneratePlaceholders: 0,
  };

  for (const row of media) {
    const target = await objects.readObjectState(row.targetKey);
    if (isExpectedSeedMediaObject(target, row)) {
      result.skippedExisting += 1;
      resolutions.push({ row, storageKey: row.targetKey });
      console.info(`exists ${row.targetKey}`);
      continue;
    }
    if (target.exists) result.invalidExisting += 1;

    const source = await objects.findLegacyObject(row);
    if (source) {
      resolutions.push({ row, storageKey: row.targetKey });
      if (!apply) {
        result.wouldCopy += 1;
        console.info(`would copy ${source.key} -> ${row.targetKey}`);
      } else {
        await objects.copyObject(source.key, row.targetKey);
        result.copied += 1;
        console.info(`copied ${source.key} -> ${row.targetKey}`);
      }
      continue;
    }

    const placeholder = createSeedMediaPlaceholder(row);
    const state = await objects.readObjectState(placeholder.storageKey);
    placeholders.push(placeholder);
    resolutions.push({ placeholder, storageKey: placeholder.storageKey });
    if (isCurrentSeedMediaPlaceholder(state, placeholder)) {
      result.reusedPlaceholders += 1;
      console.info(`exists ${placeholder.storageKey}`);
    } else if (!apply) {
      result.wouldGeneratePlaceholders += 1;
      console.info(`would generate ${placeholder.storageKey}`);
    } else {
      await objects.uploadPlaceholder(placeholder);
      result.generatedPlaceholders += 1;
      console.info(`generated ${placeholder.storageKey}`);
    }
  }

  if (apply && failOnMissing) await assertMaterialized(resolutions);

  if (apply) {
    result.databasePlaceholderRowsUpdated =
      await reconcileSeedMediaPlaceholders({ db, placeholders });
    const documentSizes = await readSeedDocumentObjectSizes({
      db,
      headObject: objects.headObject,
    });
    const updated = await updateSeedAssetRecords({
      db,
      documentSizes,
      publicBaseUrl: config.publicBaseUrl,
    });
    result.databaseDocumentSizesUpdated = updated.documentSizes;
    result.databaseUrlsUpdated = updated.urls;
  }

  console.info(
    JSON.stringify({ apply, total: media.length, ...result }, null, 2),
  );
  if (!apply)
    console.info("Dry run only. Re-run with --apply to repair objects.");

  async function assertMaterialized(items) {
    for (const item of items) {
      const state = await objects.readObjectState(item.storageKey);
      const valid = item.placeholder
        ? isCurrentSeedMediaPlaceholder(state, item.placeholder)
        : isExpectedSeedMediaObject(state, item.row);
      if (!valid) {
        throw new Error(
          `Seeded media object was not materialized: ${item.storageKey}.`,
        );
      }
    }
  }
} finally {
  await db.end({ timeout: 5 });
  objects.destroy();
}

async function readSeedMediaRows() {
  return db`
    select
      m.alt_text as "altText",
      m.metadata->>'contentType' as "contentType",
      coalesce(m.metadata->>'fileName', split_part(m.storage_key, '/', 8)) as "fileName",
      m.id as "mediaId",
      m.kind,
      l.title as "listingTitle",
      m.store_id as "storeId",
      m.storage_key as "targetKey",
      m.tenant_id as "tenantId",
      u.listing_id as "listingId",
      (m.metadata->>'sizeBytes')::int as "sizeBytes"
    from vehicle_media m
    inner join vehicle_units u on u.id = m.unit_id
    inner join vehicle_listings l on l.id = u.listing_id
    where m.metadata->>'source' = 'r2_seed'
    order by m.display_order, m.id
  `;
}

function readR2Config() {
  const hasAnyConfig = [
    "R2_BUCKET_NAME",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_BASE_URL",
  ].some((key) => Boolean(process.env[key]));
  if (!hasAnyConfig && skipMissingEnv) return null;

  return {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    endpoint: requireEnv("R2_ENDPOINT"),
    publicBaseUrl: requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, ""),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  };
}
