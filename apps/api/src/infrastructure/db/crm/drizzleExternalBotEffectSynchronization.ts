import type { ExternalBotDb } from "./drizzleExternalBotShared.js";
import type { AuthorizedExternalBotEffect } from "./drizzleExternalBotEffectRuntime.js";
import { synchronizeCanonicalHandoff } from "./drizzleExternalBotEffectSynchronizationHandoff.js";
import { synchronizeCanonicalMessage } from "./drizzleExternalBotEffectSynchronizationMessage.js";
import {
  ExternalBotCanonicalSyncIndeterminateError,
  type ExternalBotProviderOperation,
} from "./drizzleExternalBotEffectSynchronizationSupport.js";

export type { ExternalBotProviderOperation } from "./drizzleExternalBotEffectSynchronizationSupport.js";
export { ExternalBotCanonicalSyncIndeterminateError } from "./drizzleExternalBotEffectSynchronizationSupport.js";

export async function synchronizeExternalBotEffectOutcome(
  db: ExternalBotDb,
  input: {
    effect: AuthorizedExternalBotEffect;
    providerOperation?: ExternalBotProviderOperation;
  },
) {
  try {
    if (input.effect.command.action === "handoff.request") {
      await synchronizeCanonicalHandoff(
        db,
        input.effect,
        input.effect.command.payload.reason,
      );
      return;
    }
    const providerOperation = input.providerOperation;
    if (!providerOperation?.id.trim()) {
      throw new ExternalBotCanonicalSyncIndeterminateError();
    }
    await synchronizeCanonicalMessage(db, input.effect, providerOperation);
  } catch (error) {
    if (error instanceof ExternalBotCanonicalSyncIndeterminateError) {
      throw error;
    }
    throw new ExternalBotCanonicalSyncIndeterminateError(error);
  }
}
