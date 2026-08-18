import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  ExternalBotActionRecord,
  ExternalBotKillSwitchLevel,
  ExternalBotProposalRecord,
  ExternalBotScope,
} from "./externalBotModels.js";
import type {
  BotAuthorizationSnapshot,
  BotIdentity,
  CapabilityGrant,
  ExternalBotEffectDispatcher,
  ExternalBotManagerPorts,
} from "./ports/externalBotPorts.js";

export type MemoryExternalBotManagerOptions = {
  credentials?: ReadonlyMap<string, BotIdentity>;
  effectDispatcher?: ExternalBotEffectDispatcher;
  inspect?: (scope: ExternalBotScope) => Promise<
    Omit<BotAuthorizationSnapshot, "attendanceRevision"> & {
      attendanceRevision?: number;
    }
  >;
  killSwitch?: ExternalBotKillSwitchLevel | null;
  now?: () => Date;
  policyMode?: "auto" | "disabled" | "proposal";
  policy?: Partial<{
    connectionRatePerMinute: number;
    cooldownSeconds: number;
    dailyLimit: number;
  }>;
};

export function createMemoryProposalRecorder(
  actions: Map<string, ExternalBotActionRecord>,
  proposals: ExternalBotProposalRecord[],
  now: (() => Date) | undefined,
): ExternalBotManagerPorts["proposalRecorder"] {
  return {
    record: async (input) => {
      if (
        !proposals.some(
          (proposal) => proposal.idempotencyKey === input.idempotencyKey,
        )
      ) {
        proposals.push({
          ...input.scope,
          actionId: input.actionId,
          command: structuredClone(input.command),
          decision: "pending",
          id: randomUUID(),
          idempotencyKey: input.idempotencyKey,
          revision: 0,
        });
      }
      return { kind: "recorded" };
    },
    decide: async (input) => {
      const proposal = proposals.find(
        (candidate) =>
          candidate.id === input.proposalId &&
          candidate.tenantId === input.tenantId &&
          candidate.storeId === input.storeId,
      );
      if (!proposal) return { kind: "not_found" };
      const action = actions.get(proposal.actionId);
      if (!action) return { kind: "not_found" };
      if (proposal.decision !== "pending") {
        return proposal.decision === input.decision
          ? {
              kind: "existing",
              proposal: structuredClone(proposal),
              action: structuredClone(action),
            }
          : { kind: "conflict" };
      }
      if (proposal.revision !== input.expectedRevision) {
        return { kind: "conflict" };
      }
      proposal.decision = input.decision;
      proposal.decidedAt = (now ?? (() => new Date()))();
      proposal.decidedByUserId = input.actorUserId;
      proposal.revision += 1;
      action.status =
        input.decision === "approved" ? "authorized" : "cancelled";
      if (input.decision === "approved") action.actionClass = "effect";
      action.updatedAt = proposal.decidedAt;
      return {
        kind: "decided",
        proposal: structuredClone(proposal),
        action: structuredClone(action),
      };
    },
  };
}

export function policyFor(options: MemoryExternalBotManagerOptions) {
  return {
    connectionRatePerMinute: options.policy?.connectionRatePerMinute ?? 30,
    cooldownSeconds: options.policy?.cooldownSeconds ?? 0,
    dailyLimit: options.policy?.dailyLimit ?? 500,
    mode: options.policyMode ?? "auto",
  };
}

export function hashExternalBotCredential(credential: string) {
  return createHash("sha256").update(credential).digest("hex");
}

export function idempotencyScopeKey(
  input: ExternalBotScope & { idempotencyKey: string },
) {
  return [
    input.tenantId,
    input.storeId,
    input.integrationId,
    input.idempotencyKey,
  ].join(":");
}

export function grantMatches(
  grant: CapabilityGrant,
  input: ExternalBotScope & {
    action: string;
    actionClass: "effect" | "proposal";
  },
) {
  return (
    grant.action === input.action &&
    grant.tenantId === input.tenantId &&
    grant.storeId === input.storeId &&
    grant.integrationId === input.integrationId &&
    grant.channel === input.channel &&
    grant.connectionId === input.connectionId &&
    grant.threadId === input.threadId &&
    grant.provider === input.provider &&
    grant.actionClass === input.actionClass &&
    grant.modelVersion === input.modelVersion
  );
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
