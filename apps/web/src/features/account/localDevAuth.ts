export type LocalDevAccountRole =
  "agency" | "owner" | "salesman" | "supervisor";

export type LocalDevAccount = {
  email: string;
  name: string;
  role: LocalDevAccountRole;
  storeSlug?: string;
  userId: string;
};

const localDevAccountKey = "lojaveiculosv2:local-auth-user-id";

export const localDevAccounts: readonly LocalDevAccount[] = [
  {
    email: "agency.seed@lojaveiculos.com.br",
    name: "Seed Agency",
    role: "agency",
    userId: "clerk_seed_agency",
  },
  {
    email: "owner.seed@lojaveiculos.com.br",
    name: "Seed Owner",
    role: "owner",
    storeSlug: "test-store",
    userId: "clerk_seed_owner",
  },
  {
    email: "supervisor.seed@lojaveiculos.com.br",
    name: "Seed Supervisor",
    role: "supervisor",
    storeSlug: "test-store",
    userId: "clerk_seed_supervisor",
  },
  {
    email: "salesman.seed@lojaveiculos.com.br",
    name: "Seed Salesman",
    role: "salesman",
    storeSlug: "test-store",
    userId: "clerk_seed_salesman",
  },
] as const;

export type LocalDevAuthEnv = {
  VITE_DEV_CLERK_USER_ID?: string;
  VITE_DEV_STORE_SLUG?: string;
  VITE_LOCAL_AUTH_BYPASS?: string;
};

export function isLocalDevAuthEnabled(
  env: LocalDevAuthEnv = import.meta.env as LocalDevAuthEnv,
) {
  return env.VITE_LOCAL_AUTH_BYPASS === "true";
}

export function readLocalDevAccount(
  env: LocalDevAuthEnv = import.meta.env as LocalDevAuthEnv,
): LocalDevAccount | null {
  if (!isLocalDevAuthEnabled(env)) return null;

  const storedUserId = readStoredLocalDevUserId();
  const userId = storedUserId ?? env.VITE_DEV_CLERK_USER_ID?.trim();
  if (!userId) return null;

  const knownAccount = localDevAccounts.find(
    (account) => account.userId === userId,
  );
  if (knownAccount) return knownAccount;

  return {
    email: `${userId}@local.test`,
    name: userId,
    role: "owner",
    ...(env.VITE_DEV_STORE_SLUG ? { storeSlug: env.VITE_DEV_STORE_SLUG } : {}),
    userId,
  };
}

export function selectLocalDevAccount(userId: string) {
  try {
    localStorage.setItem(localDevAccountKey, userId);
  } catch {}
}

export function clearLocalDevAccount() {
  try {
    localStorage.removeItem(localDevAccountKey);
  } catch {}
}

export function readStoredLocalDevUserId() {
  try {
    return localStorage.getItem(localDevAccountKey) ?? undefined;
  } catch {
    return undefined;
  }
}
