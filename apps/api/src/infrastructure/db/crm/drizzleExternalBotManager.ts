import { createHash, randomUUID } from "node:crypto";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import { createExternalBotActionAuthenticator } from "./drizzleExternalBotAuthentication.js";
import {
  enqueueExternalBotProviderEffect,
  inspectExternalBotScope,
  recordExternalBotProposal,
  resolveExternalBotKillSwitch,
} from "./drizzleExternalBotEffects.js";
import { createExternalBotGrantStore } from "./drizzleExternalBotGrants.js";
import {
  createExternalBotActionRepository,
  createExternalBotEventOutbox,
} from "./drizzleExternalBotRepositories.js";
import {
  type ExternalBotDb,
  safeDigestEqual,
} from "./drizzleExternalBotShared.js";

export function createDrizzleExternalBotManager(input: {
  db: ExternalBotDb;
  modelVersion: string;
}): ExternalBotManagerPorts {
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  return {
    actionAuthenticator: createExternalBotActionAuthenticator(input.db, digest),
    actionRepository: createExternalBotActionRepository(input.db, digest),
    digest: { digest, equals: safeDigestEqual },
    effectAuthorizer: {
      inspect: (scope) => inspectExternalBotScope(input.db, scope),
    },
    effectDispatcher: {
      dispatch: (effect) => enqueueExternalBotProviderEffect(input.db, effect),
    },
    eventOutbox: createExternalBotEventOutbox(input.db),
    grantStore: createExternalBotGrantStore(input, digest),
    idGenerator: randomUUID,
    killSwitches: {
      resolve: (scope, action) =>
        resolveExternalBotKillSwitch(input.db, scope, action),
    },
    proposalRecorder: {
      record: (proposal) => recordExternalBotProposal(input.db, proposal),
    },
  };
}
