import type { AccountAuth } from "./apiClient";
import { createAccountApi, type AccountApi } from "./apiClient";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "./runtimeAuth";

export async function createRuntimeAccountApi(input?: {
  accessToken?: string | null;
}): Promise<AccountApi> {
  const accessToken = input?.accessToken ?? (await readClerkToken());
  return createAccountApi({
    auth: createAccountAuth(accessToken),
    fetch: window.fetch.bind(window),
    ...readRuntimeApiBaseUrl(),
  });
}

function createAccountAuth(accessToken?: string | null): AccountAuth {
  const auth = createRuntimeActorAuth(accessToken);
  return {
    ...(auth.accessToken ? { accessToken: auth.accessToken } : {}),
    ...(auth.clerkUserId ? { clerkUserId: auth.clerkUserId } : {}),
    ...(auth.userEmail ? { userEmail: auth.userEmail } : {}),
    ...(auth.userName ? { userName: auth.userName } : {}),
  };
}
