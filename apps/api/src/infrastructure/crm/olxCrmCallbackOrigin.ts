export function readOlxCrmCallbackOrigin(
  env: Record<string, string | undefined>,
) {
  const configured = env.PUBLIC_APP_URL?.trim();
  const environment = env.APP_ENV ?? env.NODE_ENV ?? "local";
  if (!configured && ["local", "test"].includes(environment)) {
    return "http://localhost:8787";
  }
  if (!configured) {
    throw new Error("PUBLIC_APP_URL is required for OLX CRM callbacks.");
  }
  return configured;
}
