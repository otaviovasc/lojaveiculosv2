import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import {
  assertR2ObjectExists,
  defaultObjectReader,
  type R2ObjectReader,
} from "./r2ObjectStorageReader.js";
import {
  createR2PublicUrl,
  createR2StorageKey,
  sanitizeR2FileName,
} from "./r2ObjectStorageKeys.js";
import {
  assertR2StorageKeyEnvironment,
  resolveR2EnvironmentPrefix,
  type R2EnvironmentPrefix,
} from "./r2EnvironmentPrefix.js";
import {
  defaultR2ObjectDeleter,
  defaultR2ObjectWriter,
  defaultR2Signer,
} from "./r2ObjectStorageCommands.js";
import {
  assertR2Option,
  parseR2ExpiresSeconds,
  requireR2Env,
  validateR2ObjectStorageEnv,
} from "./r2ObjectStorageConfig.js";
export {
  R2ObjectStorageConfigError,
  validateR2ObjectStorageEnv,
} from "./r2ObjectStorageConfig.js";

export type R2ObjectStorageOptions = {
  accessKeyId: string;
  bucketName: string;
  endpoint: string;
  environmentPrefix: R2EnvironmentPrefix;
  objectReader?: R2ObjectReader;
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

export function createR2ObjectStorage(
  options: R2ObjectStorageOptions,
): ObjectStorage {
  for (const fieldName of [
    "accessKeyId",
    "bucketName",
    "endpoint",
    "environmentPrefix",
    "publicBaseUrl",
    "secretAccessKey",
  ]) {
    assertR2Option(options, fieldName);
  }

  const downloadExpiresIn = options.downloadUrlExpiresSeconds ?? 300;
  const objectDeleter = options.objectDeleter ?? defaultR2ObjectDeleter;
  const objectReader = options.objectReader ?? defaultObjectReader;
  const uploadExpiresIn = options.uploadUrlExpiresSeconds ?? 900;
  const objectWriter = options.objectWriter ?? defaultR2ObjectWriter;
  const publicBaseUrl = options.publicBaseUrl.replace(/\/+$/, "");
  const signer = options.signer ?? defaultR2Signer;
  const uniqueId = options.uniqueId ?? randomUUID;
  const client = new S3Client({
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    endpoint: options.endpoint,
    forcePathStyle: true,
    region: options.region ?? "auto",
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  return {
    close: () => client.destroy(),
    async createUpload(input) {
      const storageKey = createR2StorageKey(
        input,
        uniqueId(),
        options.environmentPrefix,
      );
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
      assertR2StorageKeyEnvironment(
        input.storageKey,
        options.environmentPrefix,
      );
      await assertR2ObjectExists(
        objectReader,
        client,
        options.bucketName,
        input.storageKey,
      );
      const disposition = input.disposition ?? "attachment";
      const command = new GetObjectCommand({
        Bucket: options.bucketName,
        Key: input.storageKey,
        ResponseContentDisposition: `${disposition}; filename="${sanitizeR2FileName(input.fileName)}"`,
        ...(input.mimeType ? { ResponseContentType: input.mimeType } : {}),
      });
      return {
        downloadMethod: "GET",
        downloadUrl: await signer(client, command, downloadExpiresIn),
        expiresAt: new Date(Date.now() + downloadExpiresIn * 1000),
      };
    },
    async deleteObject(input) {
      assertR2StorageKeyEnvironment(
        input.storageKey,
        options.environmentPrefix,
      );
      await objectDeleter(
        client,
        new DeleteObjectCommand({
          Bucket: options.bucketName,
          Key: input.storageKey,
        }),
      );
    },
    getPublicUrl(storageKey) {
      assertR2StorageKeyEnvironment(storageKey, options.environmentPrefix);
      return createR2PublicUrl(publicBaseUrl, storageKey);
    },
    async putObject(input) {
      const storageKey = createR2StorageKey(
        input,
        uniqueId(),
        options.environmentPrefix,
      );
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
    accessKeyId: requireR2Env(env, "R2_ACCESS_KEY_ID"),
    bucketName: requireR2Env(env, "R2_BUCKET_NAME"),
    endpoint: requireR2Env(env, "R2_ENDPOINT"),
    environmentPrefix: resolveR2EnvironmentPrefix(env),
    publicBaseUrl: requireR2Env(env, "R2_PUBLIC_BASE_URL"),
    region: env.R2_REGION ?? "auto",
    secretAccessKey: requireR2Env(env, "R2_SECRET_ACCESS_KEY"),
    uploadUrlExpiresSeconds: parseR2ExpiresSeconds(
      env.R2_UPLOAD_URL_EXPIRES_SECONDS,
    ),
    downloadUrlExpiresSeconds: parseR2ExpiresSeconds(
      env.R2_DOWNLOAD_URL_EXPIRES_SECONDS,
      300,
    ),
  });
}
