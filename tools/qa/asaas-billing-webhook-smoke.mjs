import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const env = readDotEnv(".env");
const webhookUrl = requiredEnv(env, "ASAAS_WEBHOOK_URL");
const webhookSecret = requiredEnv(env, "ASAAS_WEBHOOK_SECRET");
const eventId = `evt_manual_${Date.now()}`;
const providerScope = readLocalProviderScope();
if (!providerScope) {
  throw new Error(
    "Verified Asaas customer, subscription, and plan-hire evidence is required for this smoke.",
  );
}

const response = await fetch(webhookUrl, {
  body: JSON.stringify({
    event: "PAYMENT_RECEIVED",
    id: eventId,
    payment: {
      customer: providerScope.providerCustomerId,
      dueDate: "2026-07-31",
      externalReference: providerScope.externalReference,
      id: `pay_manual_${Date.now()}`,
      invoiceUrl: "https://sandbox.asaas.com/i/manual-smoke",
      paymentDate: "2026-07-06",
      subscription: providerScope.providerSubscriptionId,
      value: 197,
    },
  }),
  headers: {
    "asaas-access-token": webhookSecret,
    "content-type": "application/json",
  },
  method: "POST",
});

const bodyText = await response.text();
const body = parseJson(bodyText);

if (!response.ok) {
  fail(`Webhook returned HTTP ${response.status}.`, body);
}
if (body?.status !== "processed") {
  fail(
    "Webhook did not process against the seeded billing subscription.",
    body,
  );
}

console.log("Asaas billing webhook smoke passed.");
console.log(`Provider event id: ${eventId}`);

function readDotEnv(path) {
  const text = readFileSync(path, "utf8");
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    values[key] = unquote(trimmed.slice(separator + 1).trim());
  }
  return values;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function readLocalProviderScope() {
  try {
    const output = execFileSync(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "lojaveiculosv2-postgres",
        "psql",
        "-U",
        "lojaveiculosv2",
        "-d",
        "lojaveiculosv2",
        "-Atc",
        "select bc.provider_customer_id || ',' || s.provider_subscription_id || ',' || hire.id::text from billing_plan_hires hire join subscriptions s on s.id = hire.subscription_id and s.tenant_id = hire.tenant_id join billing_customers bc on bc.id = s.billing_customer_id and bc.tenant_id = s.tenant_id where hire.status in ('payment_pending', 'activation_pending', 'paid_active') and bc.provider_customer_id is not null and s.provider_subscription_id is not null order by hire.updated_at desc limit 1;",
      ],
      {
        env: { ...process.env, COMPOSE_DISABLE_ENV_FILE: "1" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    const [providerCustomerId, providerSubscriptionId, externalReference] =
      output.split(",");
    if (providerCustomerId && providerSubscriptionId && externalReference) {
      return {
        externalReference,
        providerCustomerId,
        providerSubscriptionId,
      };
    }
  } catch {
    // A smoke cannot fabricate provider evidence when Docker is unavailable.
  }
  return null;
}

function requiredEnv(env, key) {
  const value = env[key];
  if (!value) throw new Error(`${key} is required for Asaas webhook smoke.`);
  return value;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function fail(message, body) {
  console.error(message);
  console.error(sanitize(body));
  process.exit(1);
}

function sanitize(value) {
  return JSON.stringify(value, null, 2).replace(
    /whsec_[A-Za-z0-9_-]+/g,
    "whsec_[redacted]",
  );
}
