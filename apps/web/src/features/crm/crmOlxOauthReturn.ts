const crmOlxOauthReturnKey = "crm.olx.oauth.return";
const markerTtlMs = 10 * 60 * 1_000;

export function markCrmOlxOauthReturn() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      crmOlxOauthReturnKey,
      JSON.stringify({ issuedAt: Date.now(), returnTo: "connection" }),
    );
  }
}

export function hasCrmOlxOauthReturn() {
  if (typeof window === "undefined") return false;
  const value = window.sessionStorage.getItem(crmOlxOauthReturnKey);
  if (!value) return false;
  try {
    const marker = JSON.parse(value) as {
      issuedAt?: unknown;
      returnTo?: unknown;
    };
    const valid =
      marker.returnTo === "connection" &&
      typeof marker.issuedAt === "number" &&
      Date.now() - marker.issuedAt >= 0 &&
      Date.now() - marker.issuedAt <= markerTtlMs;
    if (valid) return true;
  } catch {
    // Invalid or legacy markers are discarded below.
  }
  clearCrmOlxOauthReturn();
  return false;
}

export function consumeCrmOlxOauthReturn() {
  const pending = hasCrmOlxOauthReturn();
  if (pending) window.sessionStorage.removeItem(crmOlxOauthReturnKey);
  return pending;
}

export function clearCrmOlxOauthReturn() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(crmOlxOauthReturnKey);
  }
}
