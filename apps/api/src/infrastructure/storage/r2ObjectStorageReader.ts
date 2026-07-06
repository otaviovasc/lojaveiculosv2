import { HeadObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { StorageObjectNotFoundError } from "../../shared/storage/objectStorage.js";

export type R2ObjectReader = (
  client: S3Client,
  command: HeadObjectCommand,
) => Promise<void>;

export async function defaultObjectReader(
  client: S3Client,
  command: HeadObjectCommand,
): Promise<void> {
  await client.send(command);
}

export async function assertR2ObjectExists(
  objectReader: R2ObjectReader,
  client: S3Client,
  bucketName: string,
  storageKey: string,
) {
  try {
    await objectReader(
      client,
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
      }),
    );
  } catch (error) {
    if (isMissingR2Object(error)) throw new StorageObjectNotFoundError();
    throw error;
  }
}

function isMissingR2Object(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    Code?: string;
    code?: string;
    name?: string;
  };
  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.Code === "NoSuchKey" ||
    candidate.code === "NoSuchKey" ||
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound"
  );
}
