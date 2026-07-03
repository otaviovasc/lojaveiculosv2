const apiBaseUrl =
  process.env.API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787/api/v1";

const personas = [
  {
    email: "agency.seed@lojaveiculos.com.br",
    expectedDestination: "/agency/admin",
    expectedRole: "agency",
    key: "agency",
    name: "Seed Agency",
    userId: "clerk_seed_agency",
  },
  {
    email: "owner.seed@lojaveiculos.com.br",
    expectedDestination: "/dashboard",
    expectedRole: "owner",
    key: "owner",
    name: "Seed Owner",
    storeSlug: "test-store",
    userId: "clerk_seed_owner",
  },
  {
    email: "supervisor.seed@lojaveiculos.com.br",
    expectedDestination: "/dashboard",
    expectedRole: "supervisor",
    key: "supervisor",
    name: "Seed Supervisor",
    storeSlug: "test-store",
    userId: "clerk_seed_supervisor",
  },
  {
    email: "salesman.seed@lojaveiculos.com.br",
    expectedDestination: "/dashboard",
    expectedRole: "salesman",
    key: "salesman",
    name: "Seed Salesman",
    storeSlug: "test-store",
    userId: "clerk_seed_salesman",
  },
  {
    email: "investor@lojaveiculos.com.br",
    expectedDestination: "/dashboard",
    expectedRole: "investor",
    key: "investor",
    name: "Test Investor",
    storeSlug: "test-store",
    userId: "clerk_test_investor",
  },
];

const results = [];
const bootstraps = new Map();

async function main() {
  console.log(`Local permission smoke: ${apiBaseUrl}`);
  await waitForApi();
  await verifyBootstrapDestinations();
  verifyCrmWhatsappPermissions();
  await verifyStoreScopedAccess();
  await verifyRoleManagementBoundaries();
  await verifyAgencyStoreAuthorization();
  printSummary();
}

async function waitForApi() {
  const owner = persona("owner");
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await request(owner, "GET", "/session/bootstrap");
      if (response.status === 200) return;
    } catch {}
    await delay(500);
  }
  throw new Error(
    "API did not become ready. Start it with `pnpm run dev:all:local`.",
  );
}

async function verifyBootstrapDestinations() {
  for (const account of personas) {
    const response = await request(account, "GET", "/session/bootstrap");
    expectStatus(`${account.key}: bootstrap`, response, [200]);
    if (response.status !== 200) continue;

    bootstraps.set(account.key, response.body);
    expect(
      `${account.key}: clerk user`,
      response.body?.user?.clerkUserId === account.userId,
      `expected ${account.userId}, got ${response.body?.user?.clerkUserId}`,
    );
    expect(
      `${account.key}: destination`,
      resolveDestination(response.body) === account.expectedDestination,
      `expected ${account.expectedDestination}, got ${resolveDestination(
        response.body,
      )}`,
    );

    if (account.storeSlug) {
      expect(
        `${account.key}: default store role`,
        response.body?.defaultStore?.role === account.expectedRole &&
          response.body?.defaultStore?.storeSlug === account.storeSlug,
        `expected ${account.expectedRole}@${account.storeSlug}`,
      );
    } else {
      expect(
        `${account.key}: tenant role`,
        response.body?.defaultStore === null &&
          response.body?.tenantMemberships?.some(
            (membership) =>
              membership.role === account.expectedRole &&
              membership.status === "active",
          ),
        `expected active ${account.expectedRole} tenant membership and no default store`,
      );
    }
  }
}

async function verifyStoreScopedAccess() {
  for (const key of ["owner", "supervisor", "salesman", "investor"]) {
    const account = persona(key);
    const inventory = await request(
      account,
      "GET",
      "/inventory/listings?limit=1",
      { includeStore: true },
    );
    expectStatus(`${key}: inventory read`, inventory, [200]);
  }

  const ownerSettings = await request(
    persona("owner"),
    "GET",
    "/settings/store",
    {
      includeStore: true,
    },
  );
  expectStatus("owner: store settings", ownerSettings, [200]);

  for (const key of ["supervisor", "salesman", "investor"]) {
    const response = await request(persona(key), "GET", "/settings/store", {
      includeStore: true,
    });
    expectStatus(`${key}: store settings denied`, response, [403]);
  }
}

async function verifyRoleManagementBoundaries() {
  const ownerRoles = await request(persona("owner"), "GET", "/identity/roles", {
    includeStore: true,
  });
  expectStatus("owner: role management", ownerRoles, [200]);
  if (ownerRoles.status === 200) {
    expect(
      "owner: can manage roles",
      ownerRoles.body?.actor?.canManageRoles === true,
      "expected actor.canManageRoles=true",
    );
  }

  for (const key of ["supervisor", "salesman", "investor"]) {
    const response = await request(persona(key), "GET", "/identity/roles", {
      includeStore: true,
    });
    expectStatus(`${key}: role management denied`, response, [403]);
  }

  const agencyStoreRoles = await request(
    persona("agency"),
    "GET",
    "/identity/roles",
    {
      includeStore: "test-store",
    },
  );
  expectStatus(
    "agency: store-scoped role management without store membership",
    agencyStoreRoles,
    [403],
  );
}

async function verifyAgencyStoreAuthorization() {
  const agencyBootstrap = bootstraps.get("agency");
  const ownerBootstrap = bootstraps.get("owner");
  const tenantId =
    agencyBootstrap?.tenantMemberships?.[0]?.tenantId ??
    ownerBootstrap?.defaultStore?.tenantId;
  if (!tenantId) {
    fail("agency store authorization", "missing seeded tenant id");
    return;
  }

  const body = {
    publicSlug: "test-store",
    storeTradingName: "QA Store Conflict",
    tenantId,
  };
  const agencyConflict = await request(
    persona("agency"),
    "POST",
    "/agency/stores",
    {
      body,
    },
  );
  expectStatus(
    "agency: store creation reaches slug conflict",
    agencyConflict,
    [409],
  );

  const ownerDenied = await request(
    persona("owner"),
    "POST",
    "/agency/stores",
    {
      body,
    },
  );
  expectStatus("owner: agency store creation denied", ownerDenied, [403]);
}

function verifyCrmWhatsappPermissions() {
  const operatorPermissions = [
    "crm.whatsapp.assign",
    "crm.whatsapp.close",
    "crm.whatsapp.list",
    "crm.whatsapp.read",
    "crm.whatsapp.send",
    "crm.whatsapp.toggle_intervention",
  ];
  for (const key of ["owner", "supervisor", "salesman"]) {
    expectPermissionSet(`${key}: WhatsApp operator permissions`, key, {
      includes: operatorPermissions,
    });
  }
  expectPermissionSet("investor: WhatsApp read-only permissions", "investor", {
    excludes: [
      "crm.whatsapp.assign",
      "crm.whatsapp.close",
      "crm.whatsapp.send",
      "crm.whatsapp.toggle_intervention",
    ],
    includes: ["crm.whatsapp.list", "crm.whatsapp.read"],
  });
}

function expectPermissionSet(name, key, expectation) {
  const permissions = bootstraps.get(key)?.defaultStore?.effectivePermissions;
  if (!Array.isArray(permissions)) {
    fail(name, "missing defaultStore.effectivePermissions");
    return;
  }
  for (const permission of expectation.includes ?? []) {
    expect(
      `${name}: includes ${permission}`,
      permissions.includes(permission),
      `expected ${permission}`,
    );
  }
  for (const permission of expectation.excludes ?? []) {
    expect(
      `${name}: excludes ${permission}`,
      !permissions.includes(permission),
      `did not expect ${permission}`,
    );
  }
}

function persona(key) {
  const account = personas.find((item) => item.key === key);
  if (!account) throw new Error(`Unknown persona: ${key}`);
  return account;
}

async function request(account, method, path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "x-clerk-user-id": account.userId,
    "x-user-email": account.email,
    "x-user-name": account.name,
  };
  if (options.includeStore) {
    const storeSlug =
      typeof options.includeStore === "string"
        ? options.includeStore
        : account.storeSlug;
    if (storeSlug) headers["x-store-slug"] = storeSlug;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers,
    method,
    signal: AbortSignal.timeout(5000),
  });

  return {
    body: await readBody(response),
    status: response.status,
  };
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolveDestination(bootstrap) {
  if (bootstrap?.needsOnboarding) return "/onboarding";
  if (bootstrap?.platformAdmin) return "/platform/admin";
  if (bootstrap?.defaultStore) return "/dashboard";
  if (
    bootstrap?.tenantMemberships?.some(
      (membership) =>
        membership.role === "agency" && membership.status === "active",
    )
  ) {
    return "/agency/admin";
  }
  return "/onboarding";
}

function expectStatus(name, response, expectedStatuses) {
  expect(
    name,
    expectedStatuses.includes(response.status),
    `expected HTTP ${expectedStatuses.join("/")}, got ${response.status}: ${formatBody(
      response.body,
    )}`,
  );
}

function expect(name, passed, detail) {
  if (passed) {
    results.push({ name, status: "pass" });
    console.log(`PASS ${name}`);
    return;
  }
  fail(name, detail);
}

function fail(name, detail) {
  results.push({ detail, name, status: "fail" });
  console.error(`FAIL ${name}: ${detail}`);
}

function printSummary() {
  const failed = results.filter((result) => result.status === "fail");
  console.log("");
  console.log(
    `Permission smoke: ${results.length - failed.length}/${results.length} passed`,
  );
  console.log("Notes:");
  console.log(
    "- Agency role-management is currently store-scoped; this smoke keeps the seeded agency tenant-only so /auth/session routes to /agency/admin.",
  );
  console.log(
    "- Browser-level menu visibility still needs Playwright/Cypress coverage once a browser E2E dependency is added.",
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function formatBody(body) {
  if (!body) return "empty body";
  if (typeof body === "string") return body.slice(0, 300);
  return JSON.stringify(body).slice(0, 300);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
