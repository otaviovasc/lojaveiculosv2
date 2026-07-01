const localDatabaseProfiles = {
  AUDIT_DATABASE_URL: {
    databaseName: "lojaveiculosv2_audit",
    defaultUrl:
      "postgresql://lojaveiculosv2_audit:lojaveiculosv2_audit_dev@localhost:54322/lojaveiculosv2_audit",
    label: "audit",
    port: "54322",
    user: "lojaveiculosv2_audit",
  },
  DATABASE_URL: {
    databaseName: "lojaveiculosv2",
    defaultUrl:
      "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2",
    label: "product",
    port: "54321",
    user: "lojaveiculosv2",
  },
};

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const deployedRuntimeVariables = [
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_ENVIRONMENT_ID",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
  "RAILWAY_STATIC_URL",
];

export function assertSafeLocalDatabaseOperation(
  operation,
  variableNames = ["DATABASE_URL", "AUDIT_DATABASE_URL"],
) {
  assertNotDeployedRuntime(operation);
  return variableNames.map((variableName) =>
    assertKnownLocalDatabaseUrl(variableName),
  );
}

export function assertKnownLocalDatabaseUrl(variableName) {
  const profile = localDatabaseProfiles[variableName];
  if (!profile) {
    throw new Error(
      `No local database safety profile exists for ${variableName}.`,
    );
  }

  assertNotDeployedRuntime(variableName);

  const databaseUrl = process.env[variableName] ?? profile.defaultUrl;
  const parsed = parseDatabaseUrl(variableName, databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const user = decodeURIComponent(parsed.username);
  const port = parsed.port || "5432";
  const issues = [];

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    issues.push("protocol must be postgres or postgresql");
  }

  if (!localHosts.has(parsed.hostname)) {
    issues.push(`host must be local, got ${parsed.hostname}`);
  }

  if (port !== profile.port) {
    issues.push(`port must be ${profile.port}, got ${port}`);
  }

  if (databaseName !== profile.databaseName) {
    issues.push(
      `database must be ${profile.databaseName}, got ${databaseName || "<empty>"}`,
    );
  }

  if (user !== profile.user) {
    issues.push(`user must be ${profile.user}, got ${user || "<empty>"}`);
  }

  if (issues.length) {
    throw new Error(
      [
        `${variableName} is not the known local ${profile.label} database.`,
        ...issues.map((issue) => `- ${issue}`),
        "Refusing local-only database mutation.",
      ].join("\n"),
    );
  }

  return {
    databaseName,
    port,
    profile,
    user,
    variableName,
  };
}

export function localDatabasePsqlTargets() {
  return [
    {
      database: "lojaveiculosv2",
      service: "lojaveiculosv2-postgres",
      user: "lojaveiculosv2",
      variableName: "DATABASE_URL",
    },
    {
      database: "lojaveiculosv2_audit",
      service: "lojaveiculosv2-audit-postgres",
      user: "lojaveiculosv2_audit",
      variableName: "AUDIT_DATABASE_URL",
    },
  ];
}

function assertNotDeployedRuntime(operation) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${operation} is local-only. NODE_ENV=production is set.`);
  }

  if (process.env.APP_ENV === "production") {
    throw new Error(`${operation} is local-only. APP_ENV=production is set.`);
  }

  if (
    process.env.APP_ENV &&
    !["development", "local", "test"].includes(process.env.APP_ENV)
  ) {
    throw new Error(
      `${operation} is local-only. APP_ENV=${process.env.APP_ENV} is not allowed.`,
    );
  }

  for (const variableName of deployedRuntimeVariables) {
    if (process.env[variableName]) {
      throw new Error(
        `${operation} is local-only. ${variableName} is set, so this looks like a deployed runtime.`,
      );
    }
  }
}

function parseDatabaseUrl(variableName, databaseUrl) {
  try {
    return new URL(databaseUrl);
  } catch (error) {
    throw new Error(
      `${variableName} is not a valid database URL: ${error.message}`,
    );
  }
}
