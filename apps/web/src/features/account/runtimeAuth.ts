import { readRuntimeStoreSlug } from "./currentStore";
import { readLocalDevAccount, type LocalDevAuthEnv } from "./localDevAuth";

export type RuntimeAuthHeadersInput = {
  contentType?: "json" | "none";
  includeStoreSlug?: boolean;
};

export async function readClerkToken() {
  const clerk = (window as Window & ClerkRuntime).Clerk;
  return (await clerk?.session?.getToken?.()) ?? null;
}

export function readRuntimeApiBaseUrl(): { baseUrl?: string } {
  const env = import.meta.env as { VITE_API_BASE_URL?: string };
  return env.VITE_API_BASE_URL ? { baseUrl: env.VITE_API_BASE_URL } : {};
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

type ClerkRuntime = {
  Clerk?: {
    session?: {
      getToken?: () => Promise<string | null>;
    };
  };
};

type RuntimeAuthEnv = LocalDevAuthEnv & {
  VITE_DEV_CLERK_USER_ID?: string;
  VITE_DEV_STORE_SLUG?: string;
};
