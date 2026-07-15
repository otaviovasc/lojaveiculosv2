import { assert } from "./local-seed-smoke-support.mjs";

export async function verifySandboxProviders() {
  return {
    asaas: await verifyAsaas(),
    zapi: await verifyZapi(),
  };
}

async function verifyAsaas() {
  const config = readOptionalConfig(
    ["ASAAS_API_URL", "ASAAS_API_KEY"],
    ["ASAAS_API_KEY"],
  );
  if (!config) return { authenticated: false, checked: false };

  const baseUrl = new URL(config.ASAAS_API_URL);
  assert(
    baseUrl.protocol === "https:" &&
      baseUrl.hostname === "api-sandbox.asaas.com",
    "db:reset only verifies the Asaas sandbox API.",
  );
  const url = new URL(`${baseUrl.toString().replace(/\/+$/, "")}/customers`);
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      access_token: config.ASAAS_API_KEY,
    },
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });
  await assertJsonResponse(response, "Asaas sandbox");
  return { authenticated: true, checked: true };
}

async function verifyZapi() {
  const credentialNames = [
    "CRM_ZAPI_TEST_INSTANCE_ID",
    "CRM_ZAPI_TEST_INSTANCE_TOKEN",
    "CRM_ZAPI_TEST_CLIENT_TOKEN",
  ];
  const config = readOptionalConfig(
    ["CRM_ZAPI_API_BASE_URL", ...credentialNames],
    credentialNames,
  );
  if (!config) return { checked: false, connected: false };

  const baseUrl = new URL(config.CRM_ZAPI_API_BASE_URL);
  assert(
    baseUrl.protocol === "https:" && baseUrl.hostname === "api.z-api.io",
    "db:reset only verifies the shared ZAPI test instance through api.z-api.io.",
  );
  const base = baseUrl.toString().replace(/\/+$/, "");
  const instances = base.endsWith("/instances") ? base : `${base}/instances`;
  const url = `${instances}/${encodeURIComponent(config.CRM_ZAPI_TEST_INSTANCE_ID)}/token/${encodeURIComponent(config.CRM_ZAPI_TEST_INSTANCE_TOKEN)}/status`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Client-Token": config.CRM_ZAPI_TEST_CLIENT_TOKEN,
    },
    method: "GET",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await assertJsonResponse(response, "ZAPI test instance");
  return { checked: true, connected: isConnected(payload) };
}

function readOptionalConfig(names, activationNames = names) {
  const values = Object.fromEntries(
    names.map((name) => [name, process.env[name]?.trim() ?? ""]),
  );
  if (!activationNames.some((name) => values[name])) return null;
  if (names.some((name) => !values[name])) {
    const missing = names.filter((name) => !values[name]);
    throw new Error(`Incomplete sandbox configuration: ${missing.join(", ")}.`);
  }
  return values;
}

async function assertJsonResponse(response, provider) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${provider} verification failed with HTTP ${response.status}.`,
    );
  }
  if (!text.trim()) return {};
  try {
    const payload = JSON.parse(text);
    assert(
      payload && typeof payload === "object" && !Array.isArray(payload),
      `${provider} returned an invalid payload.`,
    );
    return payload;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${provider} returned a non-JSON response.`);
    }
    throw error;
  }
}

function isConnected(payload) {
  if (payload.connected === true || payload.smartphoneConnected === true) {
    return true;
  }
  const status = String(payload.status ?? "")
    .trim()
    .toLowerCase();
  return ["active", "connected", "open", "ready"].includes(status);
}
