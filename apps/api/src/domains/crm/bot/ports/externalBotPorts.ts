import type {
  ExternalBotActionName,
  ExternalBotActionRecord,
  ExternalBotCommand,
  ExternalBotEvent,
  ExternalBotKillSwitchLevel,
  ExternalBotScope,
} from "../externalBotModels.js";

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
  authorizedRequestDigest: string;
  expiresAt: Date;
  token: string;
};

export interface ExternalBotGrantStore {
  issue(input: Omit<CapabilityGrant, "token">): Promise<CapabilityGrant>;
  consume(
    input: ExternalBotScope & {
      action: ExternalBotActionName;
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
  ): Promise<ExternalBotKillSwitchLevel | null>;
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
    scope: ExternalBotScope;
  }): Promise<ExternalBotEffectResult>;
}

export interface ExternalBotProposalRecorder {
  record(input: {
    actionId: string;
    command: ExternalBotCommand;
    idempotencyKey: string;
    scope: ExternalBotScope;
  }): Promise<{ kind: "recorded" } | { kind: "failed"; code: string }>;
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
  proposalRecorder: ExternalBotProposalRecorder;
  now?: () => Date;
};
