import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import type {
  CreateObjectUploadInput,
  ObjectStorage,
  ObjectUpload,
} from "../../shared/storage/objectStorage.js";

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
    async createUpload(input) {
      const storageKey = createStorageKey(input, uniqueId());
      const command = new PutObjectCommand({
        Bucket: options.bucketName,
        ContentType: input.contentType,
        Key: storageKey,
      });
      const uploadUrl = await signer(client, command, uploadExpiresIn);

      return {
        expiresAt: new Date(Date.now() + uploadExpiresIn * 1000),
        publicUrl: createPublicUrl(publicBaseUrl, storageKey),
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
        ResponseContentDisposition: `attachment; filename="${sanitizeFileName(input.fileName)}"`,
        ...(input.mimeType ? { ResponseContentType: input.mimeType } : {}),
      });
      return {
        downloadMethod: "GET",
        downloadUrl: await signer(client, command, downloadExpiresIn),
        expiresAt: new Date(Date.now() + downloadExpiresIn * 1000),
      };
    },
    getPublicUrl(storageKey) {
      return createPublicUrl(publicBaseUrl, storageKey);
    },
    async putObject(input) {
      const storageKey = createStorageKey(input, uniqueId());
      const command = new PutObjectCommand({
        Body: input.body,
        Bucket: options.bucketName,
        ContentType: input.contentType,
        Key: storageKey,
      });
      await objectWriter(client, command);
      return {
        publicUrl: createPublicUrl(publicBaseUrl, storageKey),
        storageKey,
      };
    },
  };
}

export function createR2ObjectStorageFromEnv(
  env: Record<string, string | undefined>,
): ObjectStorage | null {
  if (!env.R2_BUCKET_NAME && !env.R2_ENDPOINT) return null;

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

function createStorageKey(
  input:
    | CreateObjectUploadInput
    | {
        fileName: string;
        scopeSegments: readonly string[];
      },
  uniqueId: string,
): string {
  const fileName = sanitizeFileName(input.fileName);
  const uniqueName = `${Date.now()}-${uniqueId}-${fileName}`;

  return [...input.scopeSegments.map(sanitizeScopeSegment), uniqueName].join(
    "/",
  );
}

function sanitizeScopeSegment(segment: string): string {
  return segment
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function sanitizeFileName(fileName: string): string {
  const cleaned = sanitizeScopeSegment(fileName);
  return cleaned || "upload";
}

function createPublicUrl(publicBaseUrl: string, storageKey: string): string {
  return `${publicBaseUrl}/${storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
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
