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

await checkJson(`${apiBaseUrl}/health`, (body) => body.ok === true);
await checkJson(
  `${apiBaseUrl}/ready`,
  (body) => body.ok === true && allChecksReady(body.checks),
);
await checkJson(`${webBaseUrl}/health`, (body) => body.ok === true);
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
  const response = await request(url);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || !accepts(body)) {
    throw new Error(`Smoke check failed for ${new URL(url).pathname}.`);
  }
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
