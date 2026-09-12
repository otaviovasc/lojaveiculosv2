import {
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { seedMediaPlaceholderMetadata } from "./seed-product-media-placeholder.mjs";

export function createSeedMediaObjectStore(config) {
  const client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: process.env.R2_REGION ?? "auto",
  });
  const listedKeys = new Map();

  return {
    async copyObject(sourceKey, targetKey) {
      await client.send(
        new CopyObjectCommand({
          Bucket: config.bucketName,
          CopySource: copySource(config.bucketName, sourceKey),
          Key: targetKey,
        }),
      );
    },

    destroy() {
      client.destroy();
    },

    async findLegacyObject(row) {
      const prefix = legacyPrefix(row);
      if (!listedKeys.has(prefix)) {
        listedKeys.set(prefix, await listObjects(client, config, prefix));
      }
      const suffix = `-${row.fileName}`;
      return (
        listedKeys
          .get(prefix)
          .filter((object) => object.key.endsWith(suffix))
          .sort((left, right) => left.key.localeCompare(right.key))[0] ?? null
      );
    },

    headObject(key) {
      return client.send(
        new HeadObjectCommand({ Bucket: config.bucketName, Key: key }),
      );
    },

    async readObjectState(key) {
      try {
        const object = await this.headObject(key);
        return {
          contentLength: object.ContentLength,
          contentType: object.ContentType,
          exists: true,
          metadata: object.Metadata ?? {},
        };
      } catch (error) {
        if (error?.$metadata?.httpStatusCode === 404) {
          return { exists: false, metadata: {} };
        }
        throw error;
      }
    },

    async uploadPlaceholder(placeholder) {
      await client.send(
        new PutObjectCommand({
          Body: placeholder.body,
          Bucket: config.bucketName,
          CacheControl: "public, max-age=300",
          ContentType: placeholder.contentType,
          Key: placeholder.storageKey,
          Metadata: seedMediaPlaceholderMetadata(placeholder),
        }),
      );
    },

    async uploadRemoteObject(row) {
      const response = await fetchRemoteImage(row.sourceUrl);
      if (!response.ok) {
        throw new Error(
          `Could not download seeded vehicle image ${row.sourceUrl}: HTTP ${response.status}.`,
        );
      }

      const contentType =
        response.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
      if (!contentType.startsWith("image/")) {
        throw new Error(
          `Seeded vehicle image ${row.sourceUrl} returned an invalid content type: ${contentType || "missing"}.`,
        );
      }
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === 0) {
        throw new Error(`Seeded vehicle image ${row.sourceUrl} was empty.`);
      }

      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: config.bucketName,
          CacheControl: "public, max-age=300",
          ContentType: contentType,
          Key: row.targetKey,
          Metadata: {
            fixture: "local-product-seed",
            mediaid: String(row.mediaId),
            sourcepage: row.sourcePage ?? row.sourceUrl,
            sourcelicense: row.sourceLicense ?? "unspecified",
            sourceurl: row.sourceUrl,
          },
        }),
      );

      return { contentType, sizeBytes: body.byteLength };
    },
  };
}

async function fetchRemoteImage(url) {
  let lastError;
  for (const candidate of [
    url,
    createCommonsFilePathFallback(url),
    `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
  ].filter(Boolean)) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(candidate, {
          headers: {
            Accept: "image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (compatible; LojaVeiculosV2 local seed media/1.0)",
          },
          signal: AbortSignal.timeout(30_000),
        });
        if (response.ok) {
          return response;
        }
        lastError = new Error(`HTTP ${response.status}`);
        if (response.status === 404) break;
        if (response.status !== 429 && response.status < 500) return response;
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw new Error(
    `Could not download seeded vehicle image ${url}: ${lastError?.message ?? "unknown error"}.`,
  );
}

function createCommonsFilePathFallback(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "upload.wikimedia.org") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const thumbIndex = parts.indexOf("thumb");
    const fileName = decodeURIComponent(
      thumbIndex >= 0 ? parts[thumbIndex + 3] : parts.at(-1),
    );
    if (!fileName) return null;
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1600`;
  } catch {
    return null;
  }
}

export function isExpectedSeedMediaObject(object, row) {
  const sourceMetadata = object.metadata?.sourceurl;
  const sourceMatches =
    Boolean(row.sourceUrl) && sourceMetadata === row.sourceUrl;
  return Boolean(
    object.exists &&
    (sourceMatches ||
      (!row.sourceUrl &&
        (!row.sizeBytes || object.contentLength === row.sizeBytes))) &&
    object.contentType?.startsWith(row.contentType),
  );
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

async function listObjects(client, config, prefix) {
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
      if (item.Key) objects.push({ key: item.Key });
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

function copySource(bucketName, sourceKey) {
  const encodedKey = sourceKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${bucketName}/${encodedKey}`;
}
