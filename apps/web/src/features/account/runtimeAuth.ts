import { getToken as getClerkToken } from "@clerk/react-router";
import { readRuntimeStoreSlug } from "./currentStore";
import { readLocalDevAccount, type LocalDevAuthEnv } from "./localDevAuth";

export type RuntimeAuthHeadersInput = {
  contentType?: "json" | "none";
  includeStoreSlug?: boolean;
};

export async function readClerkToken(options?: { skipCache?: boolean }) {
  return getClerkToken(options);
}

/**
 * Fetch wrapper that resolves a fresh Clerk session token on every request,
 * so long-lived API clients never send an expired token. On a 401 it forces
 * a token refresh and retries once.
 */
export function createRuntimeFetch(baseFetch?: typeof fetch): typeof fetch {
  const base = baseFetch ?? ((input, init) => window.fetch(input, init));

  return async (input, init) => {
    const token = await readClerkToken();
    const response = await base(
      input,
      token ? withAuthorization(init, token) : init,
    );

    const canRetry =
      response.status === 401 &&
      token !== null &&
      (init?.body == null || typeof init.body === "string");
    if (!canRetry) return response;

    const refreshedToken = await readClerkToken({ skipCache: true });
    if (!refreshedToken || refreshedToken === token) return response;
    return base(input, withAuthorization(init, refreshedToken));
  };
}

function withAuthorization(
  init: RequestInit | undefined,
  token: string,
): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

export function readRuntimeApiBaseUrl(): { baseUrl?: string } {
  const env = import.meta.env as { VITE_API_BASE_URL?: string };
  const configuredBaseUrl = env.VITE_API_BASE_URL?.trim();
  return configuredBaseUrl
    ? { baseUrl: normalizeRuntimeApiBaseUrl(configuredBaseUrl) }
    : {};
}

export function normalizeRuntimeApiBaseUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return normalizedBaseUrl.endsWith("/api/v1")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api/v1`;
}

export async function createRuntimeAuthHeaders(
  input: RuntimeAuthHeadersInput = {},
) {
  const headers: Record<string, string> = {};
  if (input.contentType !== "none")
    headers["Content-Type"] = "application/json";

  const token = await readClerkToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const env = import.meta.env as RuntimeAuthEnv;
  const localAccount = token ? null : readLocalDevAccount(env);
  if (localAccount) {
    headers["x-clerk-user-id"] = localAccount.userId;
    headers["x-user-email"] = localAccount.email;
    headers["x-user-name"] = localAccount.name;
  } else if (!token && env.VITE_DEV_CLERK_USER_ID) {
    headers["x-clerk-user-id"] = env.VITE_DEV_CLERK_USER_ID;
  }

  if (input.includeStoreSlug ?? true) {
    const storeSlug = readRuntimeStoreSlug(env);
    if (storeSlug) headers["x-store-slug"] = storeSlug;
  }

  return headers;
}

export function createRuntimeActorAuth(
  accessToken?: string | null,
  env: RuntimeAuthEnv = import.meta.env as RuntimeAuthEnv,
) {
  const localAccount = accessToken ? null : readLocalDevAccount(env);
  const storeSlug = readRuntimeStoreSlug(env);
  return {
    ...(accessToken ? { accessToken } : {}),
    ...(localAccount
      ? {
          clerkUserId: localAccount.userId,
          userEmail: localAccount.email,
          userName: localAccount.name,
        }
      : {}),
    ...(!accessToken && !localAccount && env.VITE_DEV_CLERK_USER_ID
      ? { clerkUserId: env.VITE_DEV_CLERK_USER_ID }
      : {}),
    ...(storeSlug ? { storeSlug } : {}),
  };
}

type RuntimeAuthEnv = LocalDevAuthEnv & {
  VITE_DEV_CLERK_USER_ID?: string;
  VITE_DEV_STORE_SLUG?: string;
};
