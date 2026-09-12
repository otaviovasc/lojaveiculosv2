import { oneSignalBrowser } from "./oneSignalRuntime";
import { createRuntimeCrmPushApi } from "./runtimeApi";
import type { CrmPushApi } from "./apiClient";
import type { CrmPushBrowser } from "./types";

const subscriptionStorageKey = "lojaveiculos.crm_push_subscription.v1";
const pendingCleanupStorageKey = "lojaveiculos.crm_push_cleanup_pending.v1";
let cleanupHandler: (() => Promise<void>) | null = null;

export function registerCrmPushLogoutCleanup(handler: () => Promise<void>) {
  cleanupHandler = handler;
}

export async function cleanupCrmPushBeforeLogout() {
  const handler = cleanupHandler;
  cleanupHandler = null;
  if (handler) {
    await handler().catch(() => undefined);
    return;
  }

  await cleanupCrmPushSubscription({
    api: createRuntimeCrmPushApi(),
    browser: oneSignalBrowser,
    keepalive: true,
  });
}

export async function cleanupCrmPushSubscription(input: {
  api: CrmPushApi;
  browser: CrmPushBrowser;
  keepalive?: boolean;
  subscriptionId?: string | null;
}) {
  const subscriptionId =
    input.subscriptionId ?? readRememberedCrmPushSubscriptionId();
  if (subscriptionId) rememberPendingCrmPushCleanup(subscriptionId);
  return attemptCrmPushCleanup({ ...input, subscriptionId });
}

export async function retryPendingCrmPushCleanup(input?: {
  api?: CrmPushApi;
  browser?: CrmPushBrowser;
}) {
  const subscriptionId = readPendingCrmPushSubscriptionId();
  if (!subscriptionId) return true;
  return attemptCrmPushCleanup({
    api: input?.api ?? createRuntimeCrmPushApi(),
    browser: input?.browser ?? oneSignalBrowser,
    keepalive: false,
    subscriptionId,
  });
}

export function hasPendingCrmPushCleanup() {
  return Boolean(readPendingCrmPushSubscriptionId());
}

export function rememberCrmPushSubscriptionId(subscriptionId: string) {
  try {
    localStorage.setItem(subscriptionStorageKey, subscriptionId);
  } catch {}
}

function readRememberedCrmPushSubscriptionId() {
  try {
    return localStorage.getItem(subscriptionStorageKey);
  } catch {
    return null;
  }
}

async function attemptCrmPushCleanup(input: {
  api: CrmPushApi;
  browser: CrmPushBrowser;
  keepalive?: boolean;
  subscriptionId: string | null;
}) {
  const [serverDisabled, browserOptedOut] = await Promise.all([
    input.subscriptionId
      ? settle(() =>
          input.api.disableSubscription(input.subscriptionId!, {
            keepalive: input.keepalive ?? false,
          }),
        )
      : true,
    settle(() => input.browser.optOut()),
  ]);
  const browserLoggedOut = await settle(() => input.browser.logout());
  const cleaned = serverDisabled && browserOptedOut && browserLoggedOut;
  if (cleaned && input.subscriptionId) {
    forgetPendingCrmPushCleanup(input.subscriptionId);
    forgetRememberedCrmPushSubscriptionId(input.subscriptionId);
  }
  return cleaned;
}

function rememberPendingCrmPushCleanup(subscriptionId: string) {
  try {
    localStorage.setItem(pendingCleanupStorageKey, subscriptionId);
  } catch {}
}

function readPendingCrmPushSubscriptionId() {
  try {
    return localStorage.getItem(pendingCleanupStorageKey);
  } catch {
    return null;
  }
}

function forgetPendingCrmPushCleanup(subscriptionId: string) {
  try {
    if (localStorage.getItem(pendingCleanupStorageKey) === subscriptionId) {
      localStorage.removeItem(pendingCleanupStorageKey);
    }
  } catch {}
}

function forgetRememberedCrmPushSubscriptionId(subscriptionId: string) {
  try {
    if (localStorage.getItem(subscriptionStorageKey) === subscriptionId) {
      localStorage.removeItem(subscriptionStorageKey);
    }
  } catch {}
}

async function settle(action: () => Promise<void>) {
  try {
    await action();
    return true;
  } catch {
    return false;
  }
}
