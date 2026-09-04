import { IntegrationError } from "../shared/errors/errorDescriptor.js";
import { crmRetentionRequiredRelations } from "../infrastructure/db/crm/drizzleCrmRetentionRepository.js";

type DatabaseProbeClient = {
  unsafe: (query: string) => Promise<unknown>;
};

type WaitForCrmRetentionDatabasesInput = {
  auditClient: DatabaseProbeClient;
  attempts?: number;
  initialDelayMs?: number;
  productClient: DatabaseProbeClient;
  schemaProbe?: () => Promise<void>;
  sleep?: (milliseconds: number) => Promise<void>;
};

const crmRetentionSchemaUnavailableCode = "CRM_RETENTION_SCHEMA_UNAVAILABLE";
const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function waitForCrmRetentionDatabases(
  input: WaitForCrmRetentionDatabasesInput,
): Promise<void> {
  const attempts = input.attempts ?? 60;
  const initialDelayMs = input.initialDelayMs ?? 1_000;
  const sleep = input.sleep ?? defaultSleep;
  let lastFailure: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await Promise.all([
        input.productClient.unsafe("select 1"),
        input.auditClient.unsafe("select 1"),
      ]);
      await input.schemaProbe?.();
      return;
    } catch (error) {
      lastFailure = error;
      if (attempt === attempts) {
        if (
          error instanceof IntegrationError &&
          error.descriptor.code === crmRetentionSchemaUnavailableCode
        ) {
          throw new IntegrationError(error.message, {
            ...error.descriptor,
            safeDetails: {
              ...error.descriptor.safeDetails,
              attempts,
            },
          });
        }
        const databaseCode = readDatabaseErrorCode(lastFailure);
        throw new IntegrationError(
          "CRM retention databases did not become ready.",
          {
            boundary: "database",
            code: "CRM_RETENTION_DATABASE_UNAVAILABLE",
            httpStatus: 503,
            kind: "network",
            phase: "startup",
            retryable: true,
            safeDetails: {
              attempts,
              ...(databaseCode ? { databaseCode } : {}),
            },
          },
        );
      }
      await sleep(Math.min(initialDelayMs * 2 ** (attempt - 1), 10_000));
    }
  }
}

export async function assertCrmRetentionSchemaReady(input: {
  auditClient: DatabaseProbeClient;
  productClient: DatabaseProbeClient;
}): Promise<void> {
  const [productMissing, auditMissing] = await Promise.all([
    missingRelations(input.productClient, crmRetentionRequiredRelations),
    missingRelations(input.auditClient, ["audit_events"]),
  ]);
  const missing = [
    ...productMissing.map((relation) => `product.${relation}`),
    ...auditMissing.map((relation) => `audit.${relation}`),
  ];
  if (missing.length > 0) {
    throw new IntegrationError("CRM retention schema is not ready.", {
      boundary: "database",
      code: crmRetentionSchemaUnavailableCode,
      httpStatus: 503,
      kind: "persistence",
      phase: "startup",
      retryable: true,
      safeDetails: { missingRelations: missing },
    });
  }
}

async function missingRelations(
  client: DatabaseProbeClient,
  relations: readonly string[],
): Promise<string[]> {
  const relationLiterals = relations
    .map((relation) => `'${relation}'`)
    .join(", ");
  const rows = (await client.unsafe(
    `select name, to_regclass('public.' || name)::text as relation from unnest(array[${relationLiterals}]::text[]) as relation_names(name)`,
  )) as Array<{ name: string; relation: string | null }>;
  return rows.flatMap((row) => (row.relation ? [] : [row.name]));
}

function readDatabaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]+$/.test(code)
    ? code
    : undefined;
}
