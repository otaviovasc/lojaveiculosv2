import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "../storage/storageScriptEnv.mjs";
import { assert, seedIds } from "./local-seed-smoke-support.mjs";

export async function assertSeedArtifacts(db) {
  const media = await db`
    select
      metadata->>'artifactSha256' as "artifactSha256",
      metadata->>'contentType' as "contentType",
      (metadata->>'generatedPlaceholder')::boolean as "generatedPlaceholder",
      (metadata->>'sizeBytes')::int as "sizeBytes",
      storage_key as "storageKey",
      url
    from vehicle_media
    where metadata->>'source' = 'r2_seed' and is_deleted = false
    order by storage_key
  `;
  assert(media.length >= 7, "Seed must retain the complete R2 media set.");
  assertUrlsContainKeys(media, "url", "Vehicle media");

  const storefrontAssets = await db`
    select
      content_type as "contentType",
      (metadata->>'artifactSha256') as "artifactSha256",
      (metadata->>'generatedPlaceholder')::boolean as "generatedPlaceholder",
      public_url as "publicUrl",
      size_bytes as "sizeBytes",
      storage_key as "storageKey"
    from storefront_media_assets
    where tenant_id = ${seedIds.primaryTenant} and is_deleted = false
    order by storage_key
  `;
  assert(
    storefrontAssets.length >= 2,
    "Seed must retain the storefront R2 asset set.",
  );
  assertUrlsContainKeys(storefrontAssets, "publicUrl", "Storefront asset");

  const documents = await db`
    select 'document' as source, id, storage_key as "storageKey",
      file_size_bytes as "fileSizeBytes" from documents
    where storage_key like 'generated/vehicle-workflows/%'
       or storage_key like 'seed/documents/%'
    union all
    select 'version' as source, id, storage_key, file_size_bytes
    from document_versions
    where storage_key like 'generated/vehicle-workflows/%'
       or storage_key like 'seed/documents/%'
    order by source, "storageKey"
  `;
  const counts = {
    documents: documents.length,
    media: media.length,
    storefrontAssets: storefrontAssets.length,
  };
  const config = readR2Config();
  if (!config) return { checkedR2: false, ...counts };

  const assetRows = [...media, ...storefrontAssets];
  for (const row of assetRows) {
    const actualUrl = row.url ?? row.publicUrl;
    assert(
      actualUrl === `${config.publicBaseUrl}/${row.storageKey}`,
      `Asset URL does not use R2_PUBLIC_BASE_URL: ${row.storageKey}.`,
    );
  }
  const expectedUrls = new Set(
    assetRows.map((row) => `${config.publicBaseUrl}/${row.storageKey}`),
  );
  await assertStorefrontPublicUrls(db, config.publicBaseUrl, expectedUrls);
  await assertR2Objects(config, assetRows, documents);
  return { checkedR2: true, ...counts };
}

function assertUrlsContainKeys(rows, urlKey, label) {
  for (const row of rows) {
    assert(
      row[urlKey].includes(row.storageKey),
      `${label} URL does not match ${row.storageKey}.`,
    );
  }
}

async function assertStorefrontPublicUrls(db, publicBaseUrl, expectedUrls) {
  const [site] = await db`
    select hero_image_url as "heroImageUrl"
    from store_public_site_settings where store_id = ${seedIds.primaryStore}
  `;
  assert(
    expectedUrls.has(site?.heroImageUrl),
    "Storefront hero must reference an exact seeded R2 public URL.",
  );

  const pages = await db`
    select components, seo from store_custom_pages
    where tenant_id = ${seedIds.primaryTenant}
  `;
  assert(
    !JSON.stringify(pages).includes("https://seed-assets.local.test"),
    "Storefront custom pages retain placeholder asset URLs.",
  );
  for (const value of collectStrings(pages)) {
    if (!value.startsWith("http") || !value.includes("/tenants/")) continue;
    assert(
      value.startsWith(`${publicBaseUrl}/tenants/`),
      `Custom page asset does not use R2_PUBLIC_BASE_URL: ${value}`,
    );
  }

  const [placeholders] = await db`
    select
      (select count(*)::int from store_public_site_settings
        where tenant_id = ${seedIds.primaryTenant}
          and hero_image_url like '%https://seed-assets.local.test%') as heroes,
      (select count(*)::int from storefront_media_assets
        where tenant_id = ${seedIds.primaryTenant}
          and public_url like '%https://seed-assets.local.test%') as assets,
      (select count(*)::int from store_custom_pages
        where tenant_id = ${seedIds.primaryTenant} and (
          components::text like '%https://seed-assets.local.test%'
          or seo::text like '%https://seed-assets.local.test%')) as pages
  `;
  for (const [kind, count] of Object.entries(placeholders)) {
    assert(count === 0, `Storefront ${kind} retain placeholder asset URLs.`);
  }
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectStrings);
}

async function assertR2Objects(config, assets, documents) {
  const client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: process.env.R2_REGION ?? "auto",
  });
  try {
    const objectStates = new Map();
    const storageKeys = new Set(
      [...assets, ...documents].map((row) => row.storageKey),
    );
    for (const storageKey of storageKeys) {
      const object = await client.send(
        new HeadObjectCommand({ Bucket: config.bucketName, Key: storageKey }),
      );
      objectStates.set(storageKey, object);
    }
    for (const row of assets) {
      const object = objectStates.get(row.storageKey);
      assert(
        object?.ContentLength === row.sizeBytes,
        `R2 asset byte size does not match its record: ${row.storageKey}.`,
      );
      assert(
        object?.ContentType?.startsWith(row.contentType),
        `R2 asset content type does not match its record: ${row.storageKey}.`,
      );
      if (row.generatedPlaceholder) {
        assert(
          object?.Metadata?.fixture === "local-product-seed" &&
            object.Metadata.placeholder === "true" &&
            object.Metadata.artifactsha256 === row.artifactSha256,
          `R2 generated placeholder metadata is stale: ${row.storageKey}.`,
        );
      }
    }
    for (const row of documents) {
      assert(
        row.fileSizeBytes === objectStates.get(row.storageKey)?.ContentLength,
        `${row.source} byte size does not match R2: ${row.storageKey}.`,
      );
    }
  } finally {
    client.destroy();
  }
}

function readR2Config() {
  const keys = [
    "R2_BUCKET_NAME",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_BASE_URL",
  ];
  if (!keys.some((key) => Boolean(process.env[key]))) return null;
  return {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    endpoint: requireEnv("R2_ENDPOINT"),
    publicBaseUrl: requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, ""),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  };
}
