#!/usr/bin/env node
import { basename } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { assertConfigured, json, nullableString } from "./v1-store/common.mjs";
import { loadStoreData, withV1Archive } from "./v1-store/source.mjs";
import { migrateToV2 } from "./v1-store/target.mjs";

// ── FILL THESE VALUES BEFORE RUNNING ────────────────────────────────────────
const V1_ARCHIVE_PATH =
  "/Users/otaviovasconceloss/Downloads/2026-07-20T16:32Z/db_lojaveiculos";
const V1_STORE_ID = 200;
const V2_DATABASE_URL = "";
const TARGET_OWNER_CLERK_USER_ID = "";
const TARGET_OWNER_EMAIL = "";
const TARGET_TENANT_LEGAL_NAME = "otavio tenant name";
const TARGET_STORE_LEGAL_NAME = "otavio store name";
const TARGET_STORE_TRADING_NAME = "MB Auto Store";
const TARGET_STORE_SLUG = "mb-auto-store";
const TARGET_ENTITLEMENTS = [
  "analytics",
  "automation",
  "compliance",
  "crm",
  "custom_domain",
  "external_api",
  "marketplace",
  "nfe",
  "plate_lookup",
  "simulations",
  "subdomain",
];

const APPLY = true; // Keep false for the first run. Dry-run writes are rolled back.
const ALLOW_REMOTE_TARGET = false; // Set true only for an intentional staging/production run.
const CONFIRM_STORE_SLUG = "mb-auto-store"; // When APPLY=true, type the exact TARGET_STORE_SLUG here.
const AVAILABLE_VEHICLE_SALE_POLICY = "cancelled"; // One V1 sale points to an available vehicle.
// ─────────────────────────────────────────────────────────────────────────────

const config = {
  allowRemoteTarget: ALLOW_REMOTE_TARGET,
  apply: APPLY,
  archivePath: V1_ARCHIVE_PATH,
  availableVehicleSalePolicy: AVAILABLE_VEHICLE_SALE_POLICY,
  confirmStoreSlug: CONFIRM_STORE_SLUG,
  dumpLabel: `2026-07-20:${basename(V1_ARCHIVE_PATH)}`,
  entitlements: TARGET_ENTITLEMENTS,
  legacyStoreId: V1_STORE_ID,
  ownerClerkUserId: TARGET_OWNER_CLERK_USER_ID,
  ownerEmail: TARGET_OWNER_EMAIL,
  storeLegalName: TARGET_STORE_LEGAL_NAME,
  storeSlug: TARGET_STORE_SLUG,
  storeTradingName: TARGET_STORE_TRADING_NAME,
  targetUrl: V2_DATABASE_URL,
  tenantLegalName: TARGET_TENANT_LEGAL_NAME,
};

assertConfigured(config);
const result = await withV1Archive(V1_ARCHIVE_PATH, async (source) => {
  const data = await loadStoreData(source, V1_STORE_ID);
  process.stdout.write(
    `Loaded V1 store ${V1_STORE_ID}: ${data.vehicles.length} vehicles, ${data.leads.length} leads, ${data.sales.length} sales.\n`,
  );
  config.accessEmails = await promptForMissingAccessEmails(data, config);
  return migrateToV2(data, config);
});
process.stdout.write(
  result.applied
    ? `Migration applied. V2 store id: ${result.ids.store}\n`
    : "Dry run succeeded; all V2 writes were rolled back.\n",
);

async function promptForMissingAccessEmails(data, migrationConfig) {
  const ownerAccess = data.accesses.find(
    (access) => access.clerkUserId === data.store.ownerClerkId,
  );
  const missing = data.accesses.filter((access) => {
    if (access.id === ownerAccess?.id) return false;
    return !nullableString(json(access.profile).email, 254);
  });
  if (!missing.length) return new Map();
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      `Missing email for ${missing.length} V1 user(s); run this migration in an interactive terminal.`,
    );
  }

  const knownEmails = new Set(
    [
      migrationConfig.ownerEmail,
      ...data.accesses.map((access) => json(access.profile).email),
    ]
      .filter(Boolean)
      .map((email) => String(email).trim().toLowerCase()),
  );
  const answers = new Map();
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    for (const access of missing) {
      const profile = json(access.profile);
      const name =
        nullableString(profile.name, 191) ?? `LojaAccess ${access.id}`;
      while (true) {
        const email = (
          await terminal.question(`E-mail para ${name} (acesso ${access.id}): `)
        )
          .trim()
          .toLowerCase();
        if (!isEmail(email)) {
          stdout.write("E-mail inválido. Tente novamente.\n");
          continue;
        }
        if (knownEmails.has(email)) {
          stdout.write("Este e-mail já pertence a outro usuário.\n");
          continue;
        }
        knownEmails.add(email);
        answers.set(access.id, email);
        break;
      }
    }
  } finally {
    terminal.close();
  }
  return answers;
}

function isEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
