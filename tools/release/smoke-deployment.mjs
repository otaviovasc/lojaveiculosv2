const environment = process.argv[2];
if (environment !== "staging" && environment !== "production") {
  console.error(
    "Usage: node tools/release/smoke-deployment.mjs <staging|production>",
  );
  process.exit(1);
}

const prefix = environment.toUpperCase();
const apiBaseUrl = requireUrl(`${prefix}_API_BASE_URL`);
const webBaseUrl = requireUrl(`${prefix}_WEB_BASE_URL`);

const apiHealth = await readJson(`${apiBaseUrl}/health`);
const webHealth = await readJson(`${webBaseUrl}/health`);

assertBuildContract(apiHealth, webHealth);
await checkJson(
  `${apiBaseUrl}/ready`,
  (body) => body.ok === true && allChecksReady(body.checks),
);
await checkHtml(webBaseUrl);

console.info(`${environment} deployment smoke checks passed.`);

function requireUrl(name) {
  const value = process.env[name]?.replace(/\/+$/, "");
  if (!value) {
    console.error(`${name} is required for deployment smoke checks.`);
    process.exit(1);
  }
  try {
    return new URL(value).toString().replace(/\/+$/, "");
  } catch {
    console.error(`${name} must be an absolute HTTP(S) URL.`);
    process.exit(1);
  }
}

async function checkJson(url, accepts) {
  const body = await readJson(url);
  if (!accepts(body)) {
    throw new Error(`Smoke check failed for ${new URL(url).pathname}.`);
  }
}

async function readJson(url) {
  const response = await request(url);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new Error(`Smoke check failed for ${new URL(url).pathname}.`);
  }
  return body;
}

async function checkHtml(url) {
  const response = await request(url);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("text/html")) {
    throw new Error("Public web root did not return HTML.");
  }
}

async function request(url) {
  return fetch(url, {
    headers: { "User-Agent": "lojaveiculos-release-smoke" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
}

function allChecksReady(checks) {
  return (
    checks !== null &&
    typeof checks === "object" &&
    Object.values(checks).length > 0 &&
    Object.values(checks).every((status) => status === "ready")
  );
}

function assertBuildContract(apiHealth, webHealth) {
  const apiCommit = apiHealth?.build?.commitSha;
  const webCommit = webHealth?.build?.commitSha;
  if (
    apiHealth?.ok !== true ||
    webHealth?.ok !== true ||
    apiHealth?.build?.crmApiContractVersion !== "crm-lead-session-v1" ||
    webHealth?.build?.crmApiContractVersion !== "crm-lead-session-v1" ||
    typeof apiCommit !== "string" ||
    typeof webCommit !== "string" ||
    !apiCommit ||
    !webCommit ||
    apiCommit === "unknown" ||
    webCommit === "unknown" ||
    apiCommit !== webCommit
  ) {
    throw new Error(
      "Deployed web/API build contract does not match the CRM session release.",
    );
  }
}
