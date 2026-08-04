import type {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function defaultR2Signer(
  client: S3Client,
  command: GetObjectCommand | PutObjectCommand,
  expiresIn: number,
): Promise<string> {
  return getSignedUrl(client, command, { expiresIn });
}

export async function defaultR2ObjectWriter(
  client: S3Client,
  command: PutObjectCommand,
): Promise<void> {
  await client.send(command);
}

export async function defaultR2ObjectDeleter(
  client: S3Client,
  command: DeleteObjectCommand,
): Promise<void> {
  await client.send(command);
}
