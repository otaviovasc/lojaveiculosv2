import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import {
  createR2PublicUrl,
  createR2StorageKey,
  sanitizeR2FileName,
} from "./r2ObjectStorageKeys.js";

export type R2ObjectStorageOptions = {
  accessKeyId: string;
  bucketName: string;
  endpoint: string;
  objectWriter?: R2ObjectWriter;
  publicBaseUrl: string;
  region?: string;
  secretAccessKey: string;
  signer?: R2UrlSigner;
  downloadUrlExpiresSeconds?: number;
  objectDeleter?: R2ObjectDeleter;
  uniqueId?: () => string;
  uploadUrlExpiresSeconds?: number;
};

export type R2UrlSigner = (
  client: S3Client,
  command: GetObjectCommand | PutObjectCommand,
  expiresIn: number,
) => Promise<string>;

export type R2UploadSigner = R2UrlSigner;

export type R2ObjectWriter = (
  client: S3Client,
  command: PutObjectCommand,
) => Promise<void>;

export type R2ObjectDeleter = (
  client: S3Client,
  command: DeleteObjectCommand,
) => Promise<void>;

export class R2ObjectStorageConfigError extends Error {
  constructor(fieldName: string) {
    super(`Cloudflare R2 object storage is missing ${fieldName}`);
    this.name = "R2ObjectStorageConfigError";
  }
}

export function createR2ObjectStorage(
  options: R2ObjectStorageOptions,
): ObjectStorage {
  assertRequired(options, "accessKeyId");
  assertRequired(options, "bucketName");
  assertRequired(options, "endpoint");
  assertRequired(options, "publicBaseUrl");
  assertRequired(options, "secretAccessKey");

  const downloadExpiresIn = options.downloadUrlExpiresSeconds ?? 300;
  const objectDeleter = options.objectDeleter ?? defaultObjectDeleter;
  const uploadExpiresIn = options.uploadUrlExpiresSeconds ?? 900;
  const objectWriter = options.objectWriter ?? defaultObjectWriter;
  const publicBaseUrl = options.publicBaseUrl.replace(/\/+$/, "");
  const signer = options.signer ?? defaultSigner;
  const uniqueId = options.uniqueId ?? randomUUID;
  const client = new S3Client({
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    endpoint: options.endpoint,
    forcePathStyle: true,
    region: options.region ?? "auto",
  });

  return {
    close: () => client.destroy(),
    async createUpload(input) {
      const storageKey = createR2StorageKey(input, uniqueId());
      const command = new PutObjectCommand({
        Bucket: options.bucketName,
        ContentType: input.contentType,
        Key: storageKey,
      });
      const uploadUrl = await signer(client, command, uploadExpiresIn);

      return {
        expiresAt: new Date(Date.now() + uploadExpiresIn * 1000),
        publicUrl: createR2PublicUrl(publicBaseUrl, storageKey),
        storageKey,
        uploadHeaders: { "content-type": input.contentType },
        uploadMethod: "PUT",
        uploadUrl,
      };
    },
    async createDownload(input) {
      const command = new GetObjectCommand({
        Bucket: options.bucketName,
        Key: input.storageKey,
        ResponseContentDisposition: `attachment; filename="${sanitizeR2FileName(input.fileName)}"`,
        ...(input.mimeType ? { ResponseContentType: input.mimeType } : {}),
      });
      return {
        downloadMethod: "GET",
        downloadUrl: await signer(client, command, downloadExpiresIn),
        expiresAt: new Date(Date.now() + downloadExpiresIn * 1000),
      };
    },
    async deleteObject(input) {
      await objectDeleter(
        client,
        new DeleteObjectCommand({
          Bucket: options.bucketName,
          Key: input.storageKey,
        }),
      );
    },
    getPublicUrl(storageKey) {
      return createR2PublicUrl(publicBaseUrl, storageKey);
    },
    async putObject(input) {
      const storageKey = createR2StorageKey(input, uniqueId());
      const command = new PutObjectCommand({
        Body: input.body,
        Bucket: options.bucketName,
        ContentType: input.contentType,
        Key: storageKey,
      });
      await objectWriter(client, command);
      return {
        publicUrl: createR2PublicUrl(publicBaseUrl, storageKey),
        storageKey,
      };
    },
  };
}

export function createR2ObjectStorageFromEnv(
  env: Record<string, string | undefined>,
): ObjectStorage | null {
  if (!validateR2ObjectStorageEnv(env)) return null;

  return createR2ObjectStorage({
    accessKeyId: requireEnv(env, "R2_ACCESS_KEY_ID"),
    bucketName: requireEnv(env, "R2_BUCKET_NAME"),
    endpoint: requireEnv(env, "R2_ENDPOINT"),
    publicBaseUrl: requireEnv(env, "R2_PUBLIC_BASE_URL"),
    region: env.R2_REGION ?? "auto",
    secretAccessKey: requireEnv(env, "R2_SECRET_ACCESS_KEY"),
    uploadUrlExpiresSeconds: parseExpiresSeconds(
      env.R2_UPLOAD_URL_EXPIRES_SECONDS,
    ),
    downloadUrlExpiresSeconds: parseExpiresSeconds(
      env.R2_DOWNLOAD_URL_EXPIRES_SECONDS,
      300,
    ),
  });
}

export function validateR2ObjectStorageEnv(
  env: Record<string, string | undefined>,
): boolean {
  const hasAnyConfig = [
    "R2_ACCESS_KEY_ID",
    "R2_BUCKET_NAME",
    "R2_ENDPOINT",
    "R2_PUBLIC_BASE_URL",
    "R2_SECRET_ACCESS_KEY",
  ].some((key) => Boolean(env[key]));
  if (!hasAnyConfig) return false;

  requireEnv(env, "R2_ACCESS_KEY_ID");
  requireEnv(env, "R2_BUCKET_NAME");
  requireEnv(env, "R2_ENDPOINT");
  requireEnv(env, "R2_PUBLIC_BASE_URL");
  requireEnv(env, "R2_SECRET_ACCESS_KEY");
  return true;
}

function assertRequired(
  options: R2ObjectStorageOptions,
  fieldName: keyof R2ObjectStorageOptions,
) {
  if (!options[fieldName]) {
    throw new R2ObjectStorageConfigError(String(fieldName));
  }
}

function requireEnv(
  env: Record<string, string | undefined>,
  fieldName: string,
): string {
  const value = env[fieldName];
  if (!value || value.startsWith("${{")) {
    throw new R2ObjectStorageConfigError(fieldName);
  }
  return value;
}

function parseExpiresSeconds(
  value: string | undefined,
  fallback = 900,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function defaultSigner(
  client: S3Client,
  command: GetObjectCommand | PutObjectCommand,
  expiresIn: number,
): Promise<string> {
  return getSignedUrl(client, command, { expiresIn });
}

async function defaultObjectWriter(
  client: S3Client,
  command: PutObjectCommand,
): Promise<void> {
  await client.send(command);
}

async function defaultObjectDeleter(
  client: S3Client,
  command: DeleteObjectCommand,
): Promise<void> {
  await client.send(command);
}
