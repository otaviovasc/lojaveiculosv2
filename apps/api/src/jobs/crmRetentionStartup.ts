import { IntegrationError } from "../shared/errors/errorDescriptor.js";

type DatabaseProbeClient = {
  unsafe: (query: string) => Promise<unknown>;
};

type WaitForCrmRetentionDatabasesInput = {
  auditClient: DatabaseProbeClient;
  attempts?: number;
  initialDelayMs?: number;
  productClient: DatabaseProbeClient;
  sleep?: (milliseconds: number) => Promise<void>;
};

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function waitForCrmRetentionDatabases(
  input: WaitForCrmRetentionDatabasesInput,
): Promise<void> {
  const attempts = input.attempts ?? 5;
  const initialDelayMs = input.initialDelayMs ?? 250;
  const sleep = input.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await Promise.all([
        input.productClient.unsafe("select 1"),
        input.auditClient.unsafe("select 1"),
      ]);
      return;
    } catch {
      if (attempt === attempts) {
        throw new IntegrationError(
          "CRM retention databases did not become ready.",
          {
            boundary: "database",
            code: "CRM_RETENTION_DATABASE_UNAVAILABLE",
            httpStatus: 503,
            kind: "network",
            phase: "startup",
            retryable: true,
            safeDetails: { attempts },
          },
        );
      }
      await sleep(initialDelayMs * 2 ** (attempt - 1));
    }
  }
}
