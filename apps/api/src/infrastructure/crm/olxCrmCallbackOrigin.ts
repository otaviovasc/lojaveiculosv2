export function readOlxCrmCallbackOrigin(
  env: Record<string, string | undefined>,
) {
  const environment = env.APP_ENV ?? env.NODE_ENV ?? "local";
  const isLocal = ["development", "local", "test"].includes(environment);
  const configured =
    env.API_BASE_URL?.trim() ||
    (isLocal ? env.PUBLIC_APP_URL?.trim() : undefined);
  if (!configured && isLocal) {
    return "http://localhost:8787";
  }
  if (!configured) {
    throw new Error("API_BASE_URL is required for OLX CRM callbacks.");
  }
  const url = new URL(configured);
  if (!isLocal && url.protocol !== "https:") {
    throw new Error("OLX CRM callbacks require an HTTPS API_BASE_URL.");
  }
  return url.origin;
}
