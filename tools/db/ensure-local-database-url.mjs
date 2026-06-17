const variableName = process.argv[2];

if (!variableName) {
  throw new Error("Usage: ensure-local-database-url.mjs <ENV_VAR_NAME>");
}

const fallbackUrls = {
  AUDIT_DATABASE_URL:
    "postgresql://lojaveiculosv2_audit:lojaveiculosv2_audit_dev@localhost:54322/lojaveiculosv2_audit",
  DATABASE_URL:
    "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2",
};

const databaseUrl = process.env[variableName] ?? fallbackUrls[variableName];

if (!databaseUrl) {
  throw new Error(`No database URL configured for ${variableName}`);
}

const parsed = new URL(databaseUrl);
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

if (!localHosts.has(parsed.hostname)) {
  throw new Error(
    `${variableName} points to ${parsed.hostname}. Default DB push scripts only allow local databases.`,
  );
}
