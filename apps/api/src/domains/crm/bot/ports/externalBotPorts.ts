import type {
  ExternalBotActionName,
  ExternalBotActionRecord,
  ExternalBotCommand,
  ExternalBotEvent,
  ExternalBotKillSwitchLevel,
  ExternalBotProposalRecord,
  ExternalBotScope,
} from "../externalBotModels.js";
import type { ExternalBotPolicy } from "../policies/externalBotPolicy.js";

export type BotIdentity = {
  integrationId: string;
  storeId: string;
  tenantId: string;
};

export interface ExternalBotActionAuthenticator {
  authenticate(credential: string): Promise<BotIdentity | null>;
}

export interface ExternalBotDigest {
  digest(value: string): string;
  equals(left: string, right: string): boolean;
}

export type CapabilityGrant = ExternalBotScope & {
  action: ExternalBotActionName;
  actionClass: "effect" | "proposal";
  authorizedRequestDigest: string;
  expiresAt: Date;
  token: string;
};

export interface ExternalBotGrantStore {
  issue(input: Omit<CapabilityGrant, "token">): Promise<CapabilityGrant>;
  consume(
    input: ExternalBotScope & {
      action: ExternalBotActionName;
      actionClass: "effect" | "proposal";
      now: Date;
      requestDigest: string;
      token: string;
    },
  ): Promise<"consumed" | "invalid" | "used">;
}

export interface ExternalBotActionRepository {
  accept(
    input: Omit<
      ExternalBotActionRecord,
      "createdAt" | "id" | "status" | "updatedAt"
    > & { capabilityGrant: string },
  ): Promise<
    | { kind: "accepted"; record: ExternalBotActionRecord }
    | { kind: "existing"; record: ExternalBotActionRecord }
    | { kind: "conflict" }
    | { kind: "grant_invalid" }
    | { kind: "grant_used" }
    | {
        kind: "policy_denied";
        code:
          | "connection_not_ready"
          | "cooldown_active"
          | "daily_limit_reached"
          | "human_takeover"
          | "policy_disabled"
          | "rate_limit_reached";
      }
  >;
  transition(
    id: string,
    expected: readonly ExternalBotActionRecord["status"][],
    status: ExternalBotActionRecord["status"],
    failureCode?: string,
  ): Promise<ExternalBotActionRecord | null>;
}

export interface ExternalBotEventOutbox {
  enqueue(event: ExternalBotEvent): Promise<void>;
  claim(now: Date): Promise<ExternalBotEvent | null>;
  markDeadLetter(eventId: string, failureCode: string): Promise<void>;
  markDelivered(eventId: string): Promise<void>;
  release(eventId: string, retryAt: Date, failureCode: string): Promise<void>;
}

export type BotAuthorizationSnapshot = {
  attendanceRevision: number;
  humanAttendanceActive: boolean;
  revision: number;
  scopeExists: boolean;
};

export interface ExternalBotEffectAuthorizer {
  inspect(scope: ExternalBotScope): Promise<BotAuthorizationSnapshot>;
}

export interface ExternalBotKillSwitchResolver {
  resolve(
    scope: ExternalBotScope,
    action: ExternalBotActionName,
    actionClass: "effect" | "proposal",
  ): Promise<ExternalBotKillSwitchLevel | null>;
}

export type ExternalBotPolicySnapshot = {
  actionsToday: number;
  connectionActionsInLastMinute: number;
  connectionReady: boolean;
  policy: ExternalBotPolicy;
  secondsSinceLastAction: number | null;
};

export interface ExternalBotPolicyResolver {
  resolve(
    scope: ExternalBotScope,
    action: ExternalBotActionName,
  ): Promise<ExternalBotPolicySnapshot | null>;
}

export type ExternalBotEffectResult =
  | { kind: "queued" }
  | { kind: "succeeded" }
  | { kind: "failed"; retryable: boolean; code: string }
  | { kind: "indeterminate"; code: string };

export interface ExternalBotEffectDispatcher {
  dispatch(input: {
    actionId: string;
    command: ExternalBotCommand;
    idempotencyKey: string;
    scope: ExternalBotScope & {
      expectedAttendanceRevision: number;
      expectedRevision: number;
    };
  }): Promise<ExternalBotEffectResult>;
}

export interface ExternalBotProposalRecorder {
  record(input: {
    actionId: string;
    command: ExternalBotCommand;
    idempotencyKey: string;
    scope: ExternalBotScope;
  }): Promise<{ kind: "recorded" } | { kind: "failed"; code: string }>;
  decide(input: {
    actorUserId: string;
    decision: "approved" | "rejected";
    expectedRevision: number;
    proposalId: string;
    reason?: string;
    storeId: string;
    tenantId: string;
  }): Promise<
    | {
        kind: "decided";
        proposal: ExternalBotProposalRecord;
        action: ExternalBotActionRecord;
      }
    | {
        kind: "existing";
        proposal: ExternalBotProposalRecord;
        action: ExternalBotActionRecord;
      }
    | { kind: "conflict" }
    | { kind: "not_found" }
  >;
}

export type ExternalBotManagerPorts = {
  actionAuthenticator: ExternalBotActionAuthenticator;
  actionRepository: ExternalBotActionRepository;
  digest: ExternalBotDigest;
  effectAuthorizer: ExternalBotEffectAuthorizer;
  effectDispatcher: ExternalBotEffectDispatcher;
  eventOutbox: ExternalBotEventOutbox;
  grantStore: ExternalBotGrantStore;
  idGenerator: () => string;
  killSwitches: ExternalBotKillSwitchResolver;
  modelVersion: string;
  policyResolver: ExternalBotPolicyResolver;
  proposalRecorder: ExternalBotProposalRecorder;
  now?: () => Date;
};
