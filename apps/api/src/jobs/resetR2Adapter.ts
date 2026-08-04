import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
  type DeleteObjectsOutput,
  type ListObjectsV2Output,
} from "@aws-sdk/client-s3";
import type { R2EnvironmentPrefix } from "../infrastructure/storage/r2EnvironmentPrefix.js";
import type { ResetResourceAdapter } from "./resetNonProductionEnvironment.js";

type ResettableR2Prefix = Exclude<R2EnvironmentPrefix, "p">;
type R2Command = DeleteObjectsCommand | ListObjectsV2Command;
type R2CommandOutput = DeleteObjectsOutput | ListObjectsV2Output;
export type R2CommandExecutor = (
  command: R2Command,
) => Promise<R2CommandOutput>;

export function createR2ResetAdapter(
  env: Record<string, string | undefined>,
  environmentPrefix: ResettableR2Prefix,
): ResetResourceAdapter {
  const bucketName = requireEnv(env, "R2_BUCKET_NAME");
  const client = new S3Client({
    credentials: {
      accessKeyId: requireEnv(env, "R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv(env, "R2_SECRET_ACCESS_KEY"),
    },
    endpoint: requireEnv(env, "R2_ENDPOINT"),
    forcePathStyle: true,
    region: env.R2_REGION ?? "auto",
  });
  const execute: R2CommandExecutor = (command) =>
    client.send(command as never) as Promise<R2CommandOutput>;
  const prefix = `${environmentPrefix}/`;

  return {
    close: async () => client.destroy(),
    inspect: async () => ({
      objectsToDelete: await countR2PrefixObjects(execute, bucketName, prefix),
      prefix,
    }),
    name: "cloudflare-r2",
    reset: async () => ({
      objectsDeleted: await deleteR2PrefixObjects(execute, bucketName, prefix),
      prefix,
    }),
  };
}

export async function countR2PrefixObjects(
  execute: R2CommandExecutor,
  bucketName: string,
  prefix: string,
): Promise<number> {
  assertResettablePrefix(prefix);
  let continuationToken: string | undefined;
  let count = 0;

  do {
    const output = (await execute(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      }),
    )) as ListObjectsV2Output;
    count += output.Contents?.length ?? 0;
    continuationToken = output.IsTruncated
      ? requireContinuationToken(output.NextContinuationToken)
      : undefined;
  } while (continuationToken);

  return count;
}

export async function deleteR2PrefixObjects(
  execute: R2CommandExecutor,
  bucketName: string,
  prefix: string,
): Promise<number> {
  assertResettablePrefix(prefix);
  let deleted = 0;

  while (true) {
    const listed = (await execute(
      new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1_000,
        Prefix: prefix,
      }),
    )) as ListObjectsV2Output;
    const objects = (listed.Contents ?? []).flatMap((object) =>
      object.Key ? [{ Key: object.Key }] : [],
    );
    if (objects.length === 0) break;

    const output = (await execute(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: objects, Quiet: true },
      }),
    )) as DeleteObjectsOutput;
    if (output.Errors && output.Errors.length > 0) {
      throw new Error(
        `R2 refused to delete ${output.Errors.length} object(s) under ${prefix}.`,
      );
    }
    deleted += objects.length;
  }

  return deleted;
}

function assertResettablePrefix(prefix: string): void {
  if (prefix !== "l/" && prefix !== "s/") {
    throw new Error("R2 reset only accepts the exact l/ or s/ prefix.");
  }
}

function requireContinuationToken(value: string | undefined): string {
  if (!value) {
    throw new Error(
      "R2 returned a truncated page without a continuation token.",
    );
  }
  return value;
}

function requireEnv(
  env: Record<string, string | undefined>,
  name: string,
): string {
  const value = env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for environment reset.`);
  }
  return value;
}
