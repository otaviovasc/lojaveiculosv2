import { readLocalDevAccount, readStoredLocalDevUserId } from "./localDevAuth";

const legacyCurrentStoreSlugKey = "lojaveiculosv2:current-store-slug";
const currentStoreSlugKeyPrefix = `${legacyCurrentStoreSlugKey}:`;

export function persistCurrentStoreSlug(
  storeSlug: string,
  actorKey: string | null | undefined = readRuntimeActorKey(),
) {
  try {
    localStorage.setItem(currentStoreSlugKey(actorKey), storeSlug);
    if (actorKey) localStorage.removeItem(legacyCurrentStoreSlugKey);
  } catch {}
}

export function clearCurrentStoreSlug(
  actorKey: string | null | undefined = readRuntimeActorKey(),
) {
  try {
    localStorage.removeItem(currentStoreSlugKey(actorKey));
    localStorage.removeItem(legacyCurrentStoreSlugKey);
  } catch {}
}

export function readCurrentStoreSlug(
  actorKey: string | null | undefined = readRuntimeActorKey(),
): string | undefined {
  try {
    const storeSlug = localStorage.getItem(currentStoreSlugKey(actorKey));
    if (storeSlug) return storeSlug;
    if (actorKey) return undefined;
    return localStorage.getItem(legacyCurrentStoreSlugKey) ?? undefined;
  } catch {
    return undefined;
  }
}

export function readRuntimeStoreSlug(
  env: {
    VITE_DEV_CLERK_USER_ID?: string;
    VITE_DEV_STORE_SLUG?: string;
    VITE_LOCAL_AUTH_BYPASS?: string;
  } = import.meta.env as {
    VITE_DEV_CLERK_USER_ID?: string;
    VITE_DEV_STORE_SLUG?: string;
    VITE_LOCAL_AUTH_BYPASS?: string;
  },
  actorKey: string | null | undefined = readRuntimeActorKey(),
): string | undefined {
  const localAccount = readLocalDevAccount(env);
  const resolvedActorKey = actorKey ?? localAccount?.userId;
  return (
    readCurrentStoreSlug(resolvedActorKey) ??
    localAccount?.storeSlug ??
    (env.VITE_DEV_CLERK_USER_ID ? env.VITE_DEV_STORE_SLUG : undefined)
  );
}

function currentStoreSlugKey(actorKey?: string | null) {
  return actorKey
    ? `${currentStoreSlugKeyPrefix}${encodeURIComponent(actorKey)}`
    : legacyCurrentStoreSlugKey;
}

function readRuntimeActorKey(): string | undefined {
  try {
    return (
      (window as Window & ClerkRuntime).Clerk?.user?.id ??
      readStoredLocalDevUserId()
    );
  } catch {
    return undefined;
  }
}

type ClerkRuntime = {
  Clerk?: {
    user?: {
      id?: string;
    };
  };
};
