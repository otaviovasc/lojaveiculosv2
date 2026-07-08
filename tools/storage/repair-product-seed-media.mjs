import {
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import postgres from "postgres";
import { assertSafeLocalDatabaseOperation } from "../db/local-database-safety.mjs";
import { loadLocalEnv, requireEnv } from "./storageScriptEnv.mjs";

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

const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl;
const client = new S3Client({
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  endpoint: config.endpoint,
  forcePathStyle: true,
  region: process.env.R2_REGION ?? "auto",
});
const db = postgres(databaseUrl, { max: 1 });

try {
  const media = await readSeedMediaRows();
  const listedKeys = new Map();
  const result = {
    copied: 0,
    missingSource: 0,
    skippedExisting: 0,
    wouldCopy: 0,
  };

  for (const row of media) {
    if (await objectExists(row.targetKey)) {
      result.skippedExisting += 1;
      console.info(`exists ${row.targetKey}`);
      continue;
    }

    const sourcePrefix = legacyPrefix(row);
    const source = await findLegacyObject(row, sourcePrefix, listedKeys);

    if (!source) {
      result.missingSource += 1;
      console.warn(`missing source for ${row.fileName} under ${sourcePrefix}`);
      continue;
    }

    if (!apply) {
      result.wouldCopy += 1;
      console.info(`would copy ${source.key} -> ${row.targetKey}`);
      continue;
    }

    await copyObject(source.key, row.targetKey);
    result.copied += 1;
    console.info(`copied ${source.key} -> ${row.targetKey}`);
  }

  console.info(JSON.stringify({ apply, ...result }, null, 2));
  if (!apply) {
    console.info("Dry run only. Re-run with --apply to copy missing objects.");
  }
  if (failOnMissing && result.missingSource > 0) {
    throw new Error(
      `Seeded vehicle media repair missed ${result.missingSource} source object(s).`,
    );
  }
} finally {
  await db.end({ timeout: 5 });
  client.destroy();
}

async function readSeedMediaRows() {
  return db`
    select
      m.storage_key as "targetKey",
      coalesce(m.metadata->>'fileName', split_part(m.storage_key, '/', 8)) as "fileName",
      m.kind,
      m.store_id as "storeId",
      m.tenant_id as "tenantId",
      u.listing_id as "listingId"
    from vehicle_media m
    inner join vehicle_units u on u.id = m.unit_id
    where m.metadata->>'source' = 'r2_seed'
    order by m.display_order, m.id
  `;
}

function legacyPrefix(row) {
  return [
    "tenants",
    row.tenantId,
    "stores",
    row.storeId,
    "listings",
    row.listingId,
    row.kind,
    "",
  ].join("/");
}

async function findLegacyObject(row, sourcePrefix, listedKeys) {
  if (!listedKeys.has(sourcePrefix)) {
    listedKeys.set(sourcePrefix, await listObjects(sourcePrefix));
  }

  const fileSuffix = `-${row.fileName}`;
  const candidates = listedKeys
    .get(sourcePrefix)
    .filter((object) => object.key.endsWith(fileSuffix))
    .sort((left, right) => {
      const rightTime = right.lastModified?.getTime() ?? 0;
      const leftTime = left.lastModified?.getTime() ?? 0;
      return rightTime - leftTime;
    });

  return candidates[0] ?? null;
}

async function listObjects(prefix) {
  const objects = [];
  let continuationToken;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      }),
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        objects.push({
          key: item.Key,
          lastModified: item.LastModified,
        });
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

async function objectExists(key) {
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: config.bucketName, Key: key }),
    );
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function copyObject(sourceKey, targetKey) {
  await client.send(
    new CopyObjectCommand({
      Bucket: config.bucketName,
      CopySource: copySource(sourceKey),
      Key: targetKey,
    }),
  );
}

function copySource(sourceKey) {
  return `${config.bucketName}/${sourceKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
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
