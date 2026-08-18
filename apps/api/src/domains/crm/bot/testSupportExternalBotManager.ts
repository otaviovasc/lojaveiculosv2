import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  ExternalBotActionRecord,
  ExternalBotProposalRecord,
} from "./externalBotModels.js";
import type {
  CapabilityGrant,
  ExternalBotManagerPorts,
} from "./ports/externalBotPorts.js";
import {
  createMemoryProposalRecorder,
  grantMatches,
  hashExternalBotCredential,
  idempotencyScopeKey,
  policyFor,
  safeEqual,
  type MemoryExternalBotManagerOptions,
} from "./testSupportExternalBotManagerHelpers.js";

export { hashExternalBotCredential };
export type { MemoryExternalBotManagerOptions };

export function createMemoryExternalBotManager(
  options: MemoryExternalBotManagerOptions = {},
) {
  const actions = new Map<string, ExternalBotActionRecord>();
  const idempotency = new Map<string, string>();
  const grants = new Map<string, CapabilityGrant & { used: boolean }>();
  const events: Array<{
    event: Parameters<ExternalBotManagerPorts["eventOutbox"]["enqueue"]>[0];
    failureCode?: string;
    retryAt: Date;
    status: "dead_letter" | "delivered" | "pending" | "processing";
  }> = [];
  const proposals: ExternalBotProposalRecord[] = [];
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const ports: ExternalBotManagerPorts = {
    actionAuthenticator: {
      authenticate: async (credential) =>
        options.credentials?.get(digest(credential)) ?? null,
    },
    actionRepository: {
      accept: async (input) => {
        const key = idempotencyScopeKey(input);
        const existingId = idempotency.get(key);
        const existing = existingId ? actions.get(existingId) : undefined;
        if (existing) {
          return existing.requestDigest === input.requestDigest
            ? { kind: "existing", record: structuredClone(existing) }
            : { kind: "conflict" };
        }
        const now = (options.now ?? (() => new Date()))();
        const grant = grants.get(digest(input.capabilityGrant));
        if (
          !grant ||
          !grantMatches(grant, {
            ...input,
            action: input.command.action,
          }) ||
          grant.authorizedRequestDigest !== input.requestDigest ||
          grant.expiresAt <= now
        ) {
          return { kind: "grant_invalid" };
        }
        if (grant.used) return { kind: "grant_used" };
        const policy = policyFor(options);
        if (policy.mode === "disabled") {
          return { kind: "policy_denied", code: "policy_disabled" };
        }
        if (
          (policy.mode === "proposal" ? "proposal" : "effect") !==
          input.actionClass
        ) {
          return { kind: "policy_denied", code: "policy_disabled" };
        }
        const records = [...actions.values()];
        const lastConversationAction = records
          .filter(
            (record) =>
              record.tenantId === input.tenantId &&
              record.storeId === input.storeId &&
              record.threadId === input.threadId,
          )
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          )[0];
        if (
          lastConversationAction &&
          now.getTime() - lastConversationAction.createdAt.getTime() <
            policy.cooldownSeconds * 1_000
        ) {
          return { kind: "policy_denied", code: "cooldown_active" };
        }
        if (
          records.filter(
            (record) =>
              record.tenantId === input.tenantId &&
              record.storeId === input.storeId &&
              record.connectionId === input.connectionId &&
              record.createdAt >= new Date(now.getTime() - 60_000),
          ).length >= policy.connectionRatePerMinute
        ) {
          return { kind: "policy_denied", code: "rate_limit_reached" };
        }
        const day = new Date(now);
        day.setUTCHours(0, 0, 0, 0);
        if (
          records.filter(
            (record) =>
              record.tenantId === input.tenantId &&
              record.storeId === input.storeId &&
              record.createdAt >= day,
          ).length >= policy.dailyLimit
        ) {
          return { kind: "policy_denied", code: "daily_limit_reached" };
        }
        const { capabilityGrant: _capabilityGrant, ...recordInput } = input;
        const record: ExternalBotActionRecord = {
          ...recordInput,
          createdAt: now,
          id: randomUUID(),
          status: "accepted",
          updatedAt: now,
        };
        actions.set(record.id, record);
        idempotency.set(key, record.id);
        grant.used = true;
        return { kind: "accepted", record: structuredClone(record) };
      },
      transition: async (id, expected, status, failureCode) => {
        const record = actions.get(id);
        if (!record || !expected.includes(record.status)) return null;
        record.status = status;
        record.updatedAt = (options.now ?? (() => new Date()))();
        if (failureCode) record.failureCode = failureCode;
        return structuredClone(record);
      },
    },
    digest: {
      digest,
      equals: (left, right) => safeEqual(left, right),
    },
    effectAuthorizer: {
      inspect: options.inspect
        ? async (scope) => ({
            attendanceRevision: 2,
            ...(await options.inspect!(scope)),
          })
        : async () => ({
            attendanceRevision: 2,
            humanAttendanceActive: false,
            revision: 1,
            scopeExists: true,
          }),
    },
    effectDispatcher:
      options.effectDispatcher ??
      ({ dispatch: async () => ({ kind: "succeeded" }) } as const),
    eventOutbox: {
      enqueue: async (event) =>
        void events.push({
          event,
          retryAt: event.occurredAt,
          status: "pending",
        }),
      claim: async (now) => {
        const row = events.find(
          (item) => item.status === "pending" && item.retryAt <= now,
        );
        if (!row) return null;
        row.status = "processing";
        return structuredClone(row.event);
      },
      markDeadLetter: async (eventId, failureCode) => {
        const row = events.find((item) => item.event.id === eventId);
        if (row) {
          row.failureCode = failureCode;
          row.status = "dead_letter";
        }
      },
      markDelivered: async (eventId) => {
        const row = events.find((item) => item.event.id === eventId);
        if (row) row.status = "delivered";
      },
      release: async (eventId, retryAt, failureCode) => {
        const row = events.find((item) => item.event.id === eventId);
        if (row) {
          row.failureCode = failureCode;
          row.retryAt = retryAt;
          row.status = "pending";
        }
      },
    },
    grantStore: {
      issue: async (input) => {
        const grant = {
          ...input,
          token: randomBytes(32).toString("base64url"),
          used: false,
        };
        grants.set(digest(grant.token), grant);
        return grant;
      },
      consume: async (input) => {
        const grant = grants.get(digest(input.token));
        if (
          !grant ||
          !grantMatches(grant, input) ||
          grant.authorizedRequestDigest !== input.requestDigest ||
          grant.expiresAt <= input.now
        ) {
          return "invalid";
        }
        if (grant.used) return "used";
        grant.used = true;
        return "consumed";
      },
    },
    idGenerator: randomUUID,
    killSwitches: { resolve: async () => options.killSwitch ?? null },
    modelVersion: "model-v1",
    policyResolver: {
      resolve: async (scope, action) => ({
        actionsToday: 0,
        connectionActionsInLastMinute: 0,
        connectionReady: true,
        policy: {
          action,
          channel: scope.channel,
          connectionRatePerMinute:
            options.policy?.connectionRatePerMinute ?? 30,
          cooldownSeconds: options.policy?.cooldownSeconds ?? 0,
          dailyLimit: options.policy?.dailyLimit ?? 500,
          mode: options.policyMode ?? "auto",
        },
        secondsSinceLastAction: null,
      }),
    },
    proposalRecorder: createMemoryProposalRecorder(
      actions,
      proposals,
      options.now,
    ),
    ...(options.now ? { now: options.now } : {}),
  };
  return { actions, events, ports, proposals };
}
