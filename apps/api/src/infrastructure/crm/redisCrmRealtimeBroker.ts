import { createClient } from "redis";
import type { CrmRealtimeBroker } from "../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmOlxWebhookSecurity } from "../../domains/crm/ports/crmOlxWebhookSecurity.js";
import { createCrmRealtimeBroker } from "./crmRealtimeBroker.js";
import {
  createOlxWebhookSecurity,
  createRedisOlxWebhookSecurity,
} from "./olxWebhookSecurity.js";
import {
  createRedisCrmRealtimePersistence,
  parseRedisRealtimeEnvelope,
  redisCrmRealtimeChannel,
} from "./redisCrmRealtimePersistence.js";

export type ClosableCrmRealtimeBroker = CrmRealtimeBroker & {
  close: () => Promise<void>;
  olxWebhookSecurity: CrmOlxWebhookSecurity;
  ready: () => Promise<void>;
};

export class CrmRealtimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmRealtimeConfigurationError";
  }
}

export function createRedisCrmRealtimeBroker(
  redisUrl: string,
): ClosableCrmRealtimeBroker {
  const local = createCrmRealtimeBroker();
  const commandClient = createClient({ url: redisUrl });
  const subscriberClient = commandClient.duplicate();
  const localUnsubscribers = new Set<() => void>();
  const pendingConnects = new Set<Promise<unknown>>();
  let commandConnect: Promise<unknown> | null = null;
  let subscriberConnect: Promise<unknown> | null = null;
  let closePromise: Promise<void> | null = null;
  let closed = false;
  let subscribed = false;

  commandClient.on("error", () => undefined);
  commandClient.on("reconnecting", resetCommandState);
  commandClient.on("end", resetCommandState);
  subscriberClient.on("error", () => undefined);
  subscriberClient.on("reconnecting", resetSubscriberState);
  subscriberClient.on("end", resetSubscriberState);
  const persistence = createRedisCrmRealtimePersistence(
    commandClient,
    ensureCommandClient,
  );

  return {
    close() {
      closePromise ??= closeClients();
      return closePromise;
    },
    async issueTicket(input) {
      return persistence.issueTicket(input);
    },
    olxWebhookSecurity: createRedisOlxWebhookSecurity(
      commandClient,
      ensureCommandClient,
    ),
    async publish(event) {
      await ensureSubscriber();
      const envelope = await persistence.appendEvent(event);
      await persistence.publishEnvelope(envelope);
    },
    async replay(input) {
      return persistence.replay(input);
    },
    async ready() {
      await Promise.all([ensureCommandClient(), ensureSubscriber()]);
    },
    async resolveTicket(ticket) {
      return persistence.resolveTicket(ticket);
    },
    subscribe(subscription) {
      if (closed) return () => undefined;
      const unsubscribe = local.subscribe(subscription);
      const trackedUnsubscribe = () => {
        localUnsubscribers.delete(trackedUnsubscribe);
        unsubscribe();
      };
      localUnsubscribers.add(trackedUnsubscribe);
      void ensureSubscriber().catch(() => undefined);
      return trackedUnsubscribe;
    },
  };

  async function ensureCommandClient() {
    assertOpen();
    if (commandClient.isReady) return;
    commandConnect ??= trackConnect(connectClient(commandClient));
    const pending = commandConnect;
    try {
      await pending;
      assertOpen();
    } finally {
      if (commandConnect === pending) commandConnect = null;
    }
  }

  async function ensureSubscriber() {
    assertOpen();
    if (subscribed && subscriberClient.isReady) return;
    subscriberConnect ??= trackConnect(connectSubscriber());
    const pending = subscriberConnect;
    try {
      await pending;
      assertOpen();
    } finally {
      if (subscriberConnect === pending) subscriberConnect = null;
    }
  }

  async function connectSubscriber() {
    await connectClient(subscriberClient);
    assertOpen();
    if (!subscribed)
      await subscriberClient.subscribe(redisCrmRealtimeChannel, onMessage);
    subscribed = true;
  }

  function onMessage(message: string) {
    if (closed) return;
    const envelope = parseRedisRealtimeEnvelope(message);
    if (envelope) void local.publishEnvelope(envelope);
  }

  function assertOpen() {
    if (closed) throw new Error("Redis CRM realtime broker is closed.");
  }

  function resetCommandState() {
    if (!closed) commandConnect = null;
  }

  function resetSubscriberState() {
    if (closed) return;
    subscriberConnect = null;
    subscribed = false;
  }

  function trackConnect<T>(pending: Promise<T>) {
    pendingConnects.add(pending);
    void pending.finally(() => pendingConnects.delete(pending)).catch(() => {});
    return pending;
  }

  async function closeClients() {
    closed = true;
    for (const unsubscribe of localUnsubscribers) unsubscribe();
    safeDestroy(commandClient);
    safeDestroy(subscriberClient);
    await Promise.allSettled([...pendingConnects]);
    safeDestroy(commandClient);
    safeDestroy(subscriberClient);
  }

  type RedisClient = typeof commandClient | typeof subscriberClient;

  function connectClient(client: RedisClient): Promise<unknown> {
    if (client.isReady) return Promise.resolve();
    if (!client.isOpen) return client.connect();
    return waitForReady(client);
  }

  function waitForReady(client: RedisClient): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        client.off("ready", onReady);
        client.off("error", onError);
        client.off("end", onEnd);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onEnd = () => {
        cleanup();
        reject(new Error("Redis connection closed before becoming ready."));
      };
      client.once("ready", onReady);
      client.once("error", onError);
      client.once("end", onEnd);
      if (client.isReady) onReady();
    });
  }

  function safeDestroy(client: RedisClient) {
    if (!client.isOpen) return;
    try {
      client.destroy();
    } catch {
      // A concurrent connection transition may have already closed the client.
    }
  }
}

export function createRuntimeCrmRealtimeBroker(
  env: Record<string, string | undefined>,
): ClosableCrmRealtimeBroker {
  const redisUrl = env.REDIS_URL?.trim();
  if (redisUrl) return createRedisCrmRealtimeBroker(redisUrl);
  if (!allowsInMemoryRealtime(env)) {
    throw new CrmRealtimeConfigurationError(
      "REDIS_URL must be configured before starting CRM realtime outside local/test.",
    );
  }
  return Object.assign(createCrmRealtimeBroker(), {
    close: async () => undefined,
    olxWebhookSecurity: createOlxWebhookSecurity(),
    ready: async () => undefined,
  });
}

function allowsInMemoryRealtime(env: Record<string, string | undefined>) {
  return (
    env.APP_ENV === "local" || env.APP_ENV === "test" || env.NODE_ENV === "test"
  );
}
