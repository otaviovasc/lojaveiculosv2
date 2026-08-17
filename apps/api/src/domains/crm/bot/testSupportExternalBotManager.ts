import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type {
  ExternalBotActionRecord,
  ExternalBotKillSwitchLevel,
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
  inspect?: (scope: ExternalBotScope) => Promise<BotAuthorizationSnapshot>;
  killSwitch?: ExternalBotKillSwitchLevel | null;
  now?: () => Date;
};

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
  const proposals: Array<unknown> = [];
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const ports: ExternalBotManagerPorts = {
    actionAuthenticator: {
      authenticate: async (credential) =>
        options.credentials?.get(digest(credential)) ?? null,
    },
    actionRepository: {
      accept: async (input) => {
        const { capabilityGrant: _capabilityGrant, ...recordInput } = input;
        const key = idempotencyScopeKey(input);
        const existingId = idempotency.get(key);
        const existing = existingId ? actions.get(existingId) : undefined;
        if (existing) {
          return existing.requestDigest === input.requestDigest
            ? { kind: "existing", record: structuredClone(existing) }
            : { kind: "conflict" };
        }
        const now = (options.now ?? (() => new Date()))();
        const record: ExternalBotActionRecord = {
          ...recordInput,
          createdAt: now,
          id: randomUUID(),
          status: "accepted",
          updatedAt: now,
        };
        actions.set(record.id, record);
        idempotency.set(key, record.id);
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
      inspect:
        options.inspect ??
        (async () => ({
          humanAttendanceActive: false,
          revision: 1,
          scopeExists: true,
        })),
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
    proposalRecorder: {
      record: async (input) => {
        proposals.push(structuredClone(input));
        return { kind: "recorded" };
      },
    },
    ...(options.now ? { now: options.now } : {}),
  };
  return { actions, events, ports, proposals };
}

export function hashExternalBotCredential(credential: string) {
  return createHash("sha256").update(credential).digest("hex");
}

function idempotencyScopeKey(
  input: ExternalBotScope & { idempotencyKey: string },
) {
  return [
    input.tenantId,
    input.storeId,
    input.integrationId,
    input.idempotencyKey,
  ].join(":");
}

function grantMatches(
  grant: CapabilityGrant,
  input: ExternalBotScope & { action: string },
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

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
