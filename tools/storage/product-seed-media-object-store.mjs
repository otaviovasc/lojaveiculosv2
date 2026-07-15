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
  };
}

export function isExpectedSeedMediaObject(object, row) {
  return Boolean(
    object.exists &&
    object.contentLength === row.sizeBytes &&
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
