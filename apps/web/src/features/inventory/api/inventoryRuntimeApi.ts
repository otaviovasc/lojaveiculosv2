import type { CreateInventoryApiOptions } from "./apiClient";
import type { InventoryAuth } from "../model/types";

export async function createInventoryApiOptions(): Promise<CreateInventoryApiOptions> {
  const accessToken = await readClerkToken();

  return {
    auth: createInventoryAuthFromEnv(accessToken),
    fetch: window.fetch.bind(window),
    ...readInventoryBaseUrl(),
  };
}

function createInventoryAuthFromEnv(
  accessToken?: string | null,
): InventoryAuth {
  const env = import.meta.env as {
    DEV?: boolean;
    VITE_DEV_CLERK_USER_ID?: string;
    VITE_DEV_STORE_SLUG?: string;
  };
  const clerkUserId =
    env.VITE_DEV_CLERK_USER_ID ?? (env.DEV ? "clerk_test_user" : undefined);
  const storeSlug =
    env.VITE_DEV_STORE_SLUG ?? (env.DEV ? "test-store" : undefined);

  return {
    ...(accessToken ? { accessToken } : {}),
    ...(clerkUserId ? { clerkUserId } : {}),
    ...(storeSlug ? { storeSlug } : {}),
  };
}

function readInventoryBaseUrl(): Pick<CreateInventoryApiOptions, "baseUrl"> {
  const env = import.meta.env as { VITE_API_BASE_URL?: string };
  return env.VITE_API_BASE_URL ? { baseUrl: env.VITE_API_BASE_URL } : {};
}

async function readClerkToken() {
  const clerk = (window as Window & ClerkRuntime).Clerk;

  return (await clerk?.session?.getToken?.()) ?? null;
}

type ClerkRuntime = {
  Clerk?: {
    session?: {
      getToken?: () => Promise<string | null>;
    };
  };
};
