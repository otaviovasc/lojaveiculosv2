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
const args = parseArgs(process.argv.slice(2));
const apply = Boolean(args.apply);
const skipMissingEnv = Boolean(args.skipMissingEnv);
const storeId = requireArg(args, "storeId", "--store-id");
const tenantId = requireArg(args, "tenantId", "--tenant-id");
const sourcePrefixes = readSourcePrefixes(args);
const targetPrefix = trimSlashes(
  args.targetPrefix ??
    ["tenants", tenantId, "stores", storeId, "storefront", "media"].join("/"),
);

loadLocalEnv();
assertSafeLocalDatabaseOperation("r2:migrate:legacy-banners", ["DATABASE_URL"]);

const config = readR2Config();
if (!config) {
  console.info("R2 env absent; skipped legacy banner migration.");
  process.exit(0);
}

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
  const sourceObjects = await listSourceObjects(sourcePrefixes);
  const result = {
    copied: 0,
    skippedExistingObject: 0,
    skippedUnsupported: 0,
    upsertedAssets: 0,
    wouldCopy: 0,
    wouldUpsertAssets: 0,
  };

  for (const source of sourceObjects) {
    const contentType = imageContentType(source.key);
    if (!contentType) {
      result.skippedUnsupported += 1;
      console.info(`skip unsupported ${source.key}`);
      continue;
    }

    const targetKey = createTargetKey(source, targetPrefix);
    const publicUrl = createPublicUrl(config.publicBaseUrl, targetKey);
    const asset = {
      contentType,
      fileName: fileNameFromKey(targetKey),
      metadata: {
        legacyStorageKey: source.key,
        source: "lojaveiculos_v1_banners",
        sourcePrefix: source.prefix,
      },
      publicUrl,
      sizeBytes: source.size,
      storageKey: targetKey,
    };

    if (await objectExists(targetKey)) {
      result.skippedExistingObject += 1;
      console.info(`exists ${targetKey}`);
    } else if (!apply) {
      result.wouldCopy += 1;
      console.info(`would copy ${source.key} -> ${targetKey}`);
    } else {
      await copyObject(source.key, targetKey);
      result.copied += 1;
      console.info(`copied ${source.key} -> ${targetKey}`);
    }

    if (!apply) {
      result.wouldUpsertAssets += 1;
      continue;
    }

    await upsertStorefrontMediaAsset(asset);
    result.upsertedAssets += 1;
  }

  console.info(
    JSON.stringify(
      {
        apply,
        sourceObjects: sourceObjects.length,
        sourcePrefixes,
        targetPrefix,
        ...result,
      },
      null,
      2,
    ),
  );
  if (!apply) {
    console.info(
      "Dry run only. Re-run with --apply to copy banners and upsert assets.",
    );
  }
} finally {
  await db.end({ timeout: 5 });
  client.destroy();
}

async function listSourceObjects(prefixes) {
  const objects = new Map();
  for (const prefix of prefixes) {
    for (const object of await listObjects(prefix)) {
      if (!objects.has(object.key)) objects.set(object.key, object);
    }
  }
  return [...objects.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
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
      if (!item.Key || item.Key.endsWith("/")) continue;
      objects.push({
        key: item.Key,
        prefix,
        size: item.Size ?? 0,
      });
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

async function upsertStorefrontMediaAsset(asset) {
  await db`
    insert into storefront_media_assets (
      content_type,
      file_name,
      kind,
      metadata,
      public_url,
      size_bytes,
      storage_key,
      store_id,
      tenant_id
    )
    values (
      ${asset.contentType},
      ${asset.fileName},
      'image',
      ${JSON.stringify(asset.metadata)}::jsonb,
      ${asset.publicUrl},
      ${asset.sizeBytes},
      ${asset.storageKey},
      ${storeId},
      ${tenantId}
    )
    on conflict (storage_key) do update set
      content_type = excluded.content_type,
      file_name = excluded.file_name,
      metadata = excluded.metadata,
      public_url = excluded.public_url,
      size_bytes = excluded.size_bytes,
      is_deleted = false,
      deleted_at = null,
      updated_at = now()
  `;
}

function createTargetKey(source, prefix) {
  const relativeKey = source.key.slice(source.prefix.length);
  const sourceFolder = source.prefix.startsWith("tenant-banners/")
    ? "tenant-banners"
    : trimSlashes(source.prefix);
  const segments = [sourceFolder, ...relativeKey.split("/")]
    .map(sanitizeKeySegment)
    .filter(Boolean);
  return `${prefix}/legacy-banners/${segments.join("/")}`;
}

function readSourcePrefixes(options) {
  if (options.sourcePrefix) {
    return splitCommaList(options.sourcePrefix).map(ensureTrailingSlash);
  }

  const prefixes = ["banners/"];
  if (options.storeSlug) {
    prefixes.push(`tenant-banners/${sanitizeTenantSlug(options.storeSlug)}/`);
  }
  return prefixes;
}

function createPublicUrl(publicBaseUrl, storageKey) {
  return `${publicBaseUrl.replace(/\/+$/g, "")}/${storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function copySource(sourceKey) {
  return `${config.bucketName}/${sourceKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function imageContentType(key) {
  const extension = key.split(".").pop()?.toLowerCase();
  const types = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return extension ? types[extension] : null;
}

function fileNameFromKey(key) {
  return key.split("/").filter(Boolean).at(-1) ?? "legacy-banner";
}

function sanitizeKeySegment(segment) {
  return segment
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function sanitizeTenantSlug(slug) {
  return slug.replace(/^\/+|\/+$/g, "");
}

function ensureTrailingSlash(value) {
  return `${trimSlashes(value)}/`;
}

function trimSlashes(value) {
  return String(value).replace(/^\/+|\/+$/g, "");
}

function splitCommaList(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    publicBaseUrl: requireEnv("R2_PUBLIC_BASE_URL"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  };
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;

    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function requireArg(options, key, flagName) {
  const value = options[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new Error(`${flagName} is required.`);
}
