import { createHash, randomUUID } from "node:crypto";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import { createExternalBotActionAuthenticator } from "./drizzleExternalBotAuthentication.js";
import {
  dispatchExternalBotEffect,
  createExternalBotProposalDecider,
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
import { createExternalBotPolicyResolver } from "./drizzleExternalBotPolicies.js";

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
      dispatch: (effect) => dispatchExternalBotEffect(input.db, effect),
    },
    eventOutbox: createExternalBotEventOutbox(input.db),
    grantStore: createExternalBotGrantStore(input, digest),
    idGenerator: randomUUID,
    killSwitches: {
      resolve: (scope, action, actionClass) =>
        resolveExternalBotKillSwitch(input.db, scope, action, actionClass),
    },
    modelVersion: input.modelVersion,
    policyResolver: createExternalBotPolicyResolver(input.db),
    proposalRecorder: {
      decide: createExternalBotProposalDecider(input.db),
      record: (proposal) => recordExternalBotProposal(input.db, proposal),
    },
  };
}
