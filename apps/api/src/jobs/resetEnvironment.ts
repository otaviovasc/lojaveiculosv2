import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createConsoleServiceLogger } from "../shared/serviceLogger.js";
import {
  resetNonProductionEnvironment,
  type ResetReporter,
} from "./resetNonProductionEnvironment.js";
import {
  createAuditPostgresResetAdapter,
  createProductPostgresResetAdapter,
} from "./resetPostgresAdapters.js";
import { createR2ResetAdapter } from "./resetR2Adapter.js";
import { createRedisResetAdapter } from "./resetRedisAdapter.js";
import {
  assertDistinctDatabaseTargets,
  parseResetCommand,
} from "./resetEnvironmentSafety.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.reset-environment",
  environment: process.env.APP_ENV ?? "unknown",
  service: "api",
});

async function main(): Promise<void> {
  const command = parseResetCommand(process.argv.slice(2), process.env);
  const productDatabaseUrl = requireEnv("DATABASE_URL");
  const auditDatabaseUrl = requireEnv("AUDIT_DATABASE_URL");
  const redisUrl = requireEnv("REDIS_URL");
  requireR2Environment(process.env);
  assertDistinctDatabaseTargets(productDatabaseUrl, auditDatabaseUrl);

  logger.info("job.environment_reset.started", {
    apply: command.apply,
    environment: command.environment,
  });

  const r2Prefix = command.environment === "staging" ? "s" : "l";
  const adapters = [
    createProductPostgresResetAdapter(productDatabaseUrl),
    createAuditPostgresResetAdapter(auditDatabaseUrl),
    createRedisResetAdapter(redisUrl),
    createR2ResetAdapter(process.env, r2Prefix),
  ];
  const report: ResetReporter = (event, resource, summary) => {
    logger.info(`job.environment_reset.${event}`, { resource, ...summary });
  };

  await resetNonProductionEnvironment(command, adapters, report);
  logger.info("job.environment_reset.completed", {
    apply: command.apply,
    environment: command.environment,
  });
}

function requireR2Environment(env: Record<string, string | undefined>): void {
  for (const name of [
    "R2_ACCESS_KEY_ID",
    "R2_BUCKET_NAME",
    "R2_ENDPOINT",
    "R2_SECRET_ACCESS_KEY",
  ]) {
    requireEnv(name, env);
  }
}

function requireEnv(
  name: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const value = env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for environment reset.`);
  }
  return value;
}

void main().catch((error) => {
  logger.error("job.environment_reset.failed", {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "Error",
  });
  process.exitCode = 1;
});
