import {
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import postgres from "postgres";

const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";
const apply = process.argv.includes("--apply");

loadLocalEnv();

const bucketName = requireEnv("R2_BUCKET_NAME");
const endpoint = requireEnv("R2_ENDPOINT");
const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl;
const client = new S3Client({
  credentials: { accessKeyId, secretAccessKey },
  endpoint,
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
    const sourcePrefix = legacyPrefix(row);
    const source = await findLegacyObject(row, sourcePrefix, listedKeys);

    if (!source) {
      result.missingSource += 1;
      console.warn(`missing source for ${row.fileName} under ${sourcePrefix}`);
      continue;
    }

    if (await objectExists(row.targetKey)) {
      result.skippedExisting += 1;
      console.info(`exists ${row.targetKey}`);
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
        Bucket: bucketName,
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
    await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function copyObject(sourceKey, targetKey) {
  await client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: copySource(sourceKey),
      Key: targetKey,
    }),
  );
}

function copySource(sourceKey) {
  return `${bucketName}/${sourceKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function loadLocalEnv(startDirectory = process.cwd()) {
  let current = startDirectory;

  for (let depth = 0; depth < 5; depth += 1) {
    const envPath = join(current, ".env");
    if (existsSync(envPath)) {
      loadEnvFile(envPath);
      return;
    }

    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function loadEnvFile(path) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) continue;
    process.env[parsed.key] = parsed.value;
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separator = trimmed.indexOf("=");
  if (separator === -1) return null;

  const key = trimmed.slice(0, separator).trim();
  const value = trimmed
    .slice(separator + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  return key ? { key, value } : null;
}
