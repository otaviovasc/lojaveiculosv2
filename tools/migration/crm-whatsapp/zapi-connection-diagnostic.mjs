import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

class DiagnosticError extends Error {}

const envPath = resolve(".env");
loadEnvFile(envPath);

const args = parseArgs(process.argv.slice(2));
const runRealE2e = process.env.RUN_ZAPI_E2E === "true";

if (!runRealE2e && !args.force) {
  fail(
    "RUN_ZAPI_E2E must be true before calling ZAPI. Pass --force only for manual diagnostics.",
  );
}

const config = {
  apiBaseUrl: requiredEnv("CRM_ZAPI_API_BASE_URL"),
  instanceId: requiredEnv("CRM_ZAPI_TEST_INSTANCE_ID"),
  instanceToken: requiredEnv("CRM_ZAPI_TEST_INSTANCE_TOKEN"),
  clientToken: requiredEnv("CRM_ZAPI_TEST_CLIENT_TOKEN"),
  pairPhone: args.pairPhone ?? process.env.CRM_ZAPI_TEST_PAIR_PHONE ?? "",
};

const outputDir = resolve("reports/zapi");
const instanceBaseUrl = buildInstanceBaseUrl(config);
const safeInstance = mask(config.instanceId, 6, 4);

console.log("ZAPI diagnostic");
console.log(`Instance: ${safeInstance}`);
console.log(`RUN_ZAPI_E2E: ${String(runRealE2e)}`);

try {
  const status = await requestJson(`${instanceBaseUrl}/status`, config);
  console.log("\nStatus");
  printJsonSummary(status, [
    "connected",
    "smartphoneConnected",
    "status",
    "message",
  ]);

  const connectedPhone = readFirstString(status, [
    "connectedPhone",
    "phone",
    "number",
    "connectedNumber",
  ]);

  if (connectedPhone) {
    console.log(`connectedPhone: ${connectedPhone}`);
  }

  if (isConnected(status)) {
    console.log("\nInstance is already connected.");
  } else {
    await writeQrImage(instanceBaseUrl, config, outputDir);
  }

  if (config.pairPhone) {
    await printPhoneCode(instanceBaseUrl, config);
  } else {
    console.log("\nPhone pairing code: skipped");
    console.log(
      "Pass --pair-phone 55XXXXXXXXXXX or set CRM_ZAPI_TEST_PAIR_PHONE to request one.",
    );
  }
} catch (error) {
  if (error instanceof DiagnosticError) fail(error.message);
  throw error;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) continue;
    process.env[parsed.key] = parsed.value;
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separator = trimmed.indexOf("=");
  if (separator === -1) return null;

  const key = trimmed.slice(0, separator).trim();
  const value = trimmed
    .slice(separator + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  return key ? { key, value } : null;
}

function parseArgs(rawArgs) {
  const parsed = { force: false, pairPhone: undefined };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--force") {
      parsed.force = true;
      continue;
    }
    if (arg === "--pair-phone") {
      const value = rawArgs[index + 1];
      if (!value || value.startsWith("--")) {
        fail("--pair-phone requires a phone number.");
      }
      parsed.pairPhone = normalizePhone(value);
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}

function buildInstanceBaseUrl(config) {
  const base = config.apiBaseUrl.replace(/\/+$/, "");
  const instancesBase = base.endsWith("/instances")
    ? base
    : `${base}/instances`;
  return `${instancesBase}/${encodeURIComponent(
    config.instanceId,
  )}/token/${encodeURIComponent(config.instanceToken)}`;
}

async function requestJson(url, config) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Client-Token": config.clientToken,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new DiagnosticError(
      `ZAPI request failed: HTTP ${response.status} ${response.statusText} ${summarizeText(
        text,
      )}`,
    );
  }

  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { value: text };
  }
}

async function writeQrImage(instanceBaseUrl, config, outputPath) {
  const response = await fetch(`${instanceBaseUrl}/qr-code/image`, {
    method: "GET",
    headers: {
      Accept: "application/json,image/png,image/jpeg,*/*",
      "Client-Token": config.clientToken,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    throw new DiagnosticError(
      `ZAPI QR request failed: HTTP ${response.status} ${response.statusText} ${summarizeText(
        bytes.toString("utf8"),
      )}`,
    );
  }

  mkdirSync(outputPath, { recursive: true });

  if (contentType.startsWith("image/")) {
    const extension = contentType.includes("jpeg") ? "jpg" : "png";
    const file = join(outputPath, `test-instance-qr.${extension}`);
    writeFileSync(file, bytes);
    console.log("\nQR code");
    console.log(`image: ${file}`);
    return;
  }

  const text = bytes.toString("utf8");
  const payload = parseJsonOrValue(text);
  const qrImage = findQrImage(payload);

  console.log("\nQR code");
  printJsonSummary(payload, ["connected", "status", "message", "error"]);

  if (qrImage) {
    const { buffer, extension } = qrImage;
    const file = join(outputPath, `test-instance-qr.${extension}`);
    writeFileSync(file, buffer);
    console.log(`image: ${file}`);
    return;
  }

  const qrPayload = findQrPayload(payload);
  if (qrPayload) {
    const file = join(outputPath, "test-instance-qr-payload.txt");
    writeFileSync(file, qrPayload);
    console.log(`payload: ${file}`);
    console.log("payloadPreview: " + summarizeText(qrPayload, 120));
    return;
  }

  console.log("No QR image or payload found in ZAPI response.");
}

async function printPhoneCode(instanceBaseUrl, config) {
  const phone = normalizePhone(config.pairPhone);
  if (!phone) return;

  const response = await requestJson(
    `${instanceBaseUrl}/phone-code/${phone}`,
    config,
  );
  const code = readFirstString(response, [
    "value",
    "code",
    "phoneCode",
    "pairingCode",
  ]);

  console.log("\nPhone pairing code");
  if (code) {
    console.log(`code: ${code}`);
  } else {
    printJsonSummary(response, ["connected", "status", "message", "error"]);
    console.log("No pairing code found in ZAPI response.");
  }
}

function parseJsonOrValue(text) {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return { value: trimmed };
  }
}

function findQrImage(value) {
  for (const candidate of collectStrings(value)) {
    const parsed = parseDataUri(candidate) ?? parseBase64Image(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function findQrPayload(value) {
  const strings = collectStrings(value);
  return (
    strings.find((candidate) => candidate.startsWith("2@")) ??
    strings.find(
      (candidate) => candidate.length > 80 && !looksLikeBase64(candidate),
    ) ??
    null
  );
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  return Object.values(value).flatMap(collectStrings);
}

function parseDataUri(value) {
  const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(value.trim());
  if (!match) return null;

  const [, rawExtension, base64] = match;
  return {
    buffer: Buffer.from(base64, "base64"),
    extension: rawExtension === "jpeg" ? "jpg" : rawExtension,
  };
}

function parseBase64Image(value) {
  const normalized = value.trim().replace(/\s/g, "");
  if (!looksLikeBase64(normalized)) return null;

  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length < 32) return null;

  if (buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return { buffer, extension: "png" };
  }
  if (buffer.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))) {
    return { buffer, extension: "jpg" };
  }

  return null;
}

function looksLikeBase64(value) {
  return value.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function isConnected(status) {
  return (
    status?.connected === true ||
    status?.smartphoneConnected === true ||
    String(status?.status ?? "").toUpperCase() === "CONNECTED"
  );
}

function printJsonSummary(value, keys) {
  if (!value || typeof value !== "object") return;

  for (const key of keys) {
    if (value[key] === undefined || value[key] === null || value[key] === "")
      continue;
    console.log(`${key}: ${String(value[key])}`);
  }
}

function readFirstString(value, keys) {
  if (!value || typeof value !== "object") return "";

  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (typeof raw === "number") return String(raw);
  }

  return "";
}

function normalizePhone(value) {
  return value.replace(/[^\d]/g, "");
}

function mask(value, left, right) {
  if (value.length <= left + right) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function summarizeText(value, maxLength = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
