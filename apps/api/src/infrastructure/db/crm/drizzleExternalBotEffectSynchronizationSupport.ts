import type { ExternalBotRow } from "./drizzleExternalBotShared.js";

export type ExternalBotProviderOperation = {
  id: string;
  occurredAt: Date;
};

export function assertExactlyOne(result: unknown) {
  if ((result as unknown as ExternalBotRow[]).length !== 1) {
    throw new ExternalBotCanonicalSyncIndeterminateError();
  }
}

export class ExternalBotCanonicalSyncIndeterminateError extends Error {
  readonly code = "canonical_sync_indeterminate";

  constructor(cause?: unknown) {
    super("Canonical CRM bot outcome is pending reconciliation.", { cause });
    this.name = "ExternalBotCanonicalSyncIndeterminateError";
  }
}
