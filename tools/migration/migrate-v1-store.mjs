#!/usr/bin/env node
import { basename } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { assertConfigured, json, nullableString } from "./v1-store/common.mjs";
import { loadR2Env } from "./v1-store/document-artifacts.mjs";
import { loadStoreData, withV1Archive } from "./v1-store/source.mjs";
import { MIGRATION_MODULES, migrateToV2 } from "./v1-store/target.mjs";

const DEFAULT_ENTITLEMENTS = [
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

const modules = parseModuleArgs(process.argv.slice(2));
loadR2Env();
const config = await promptConfig();
config.modules = modules;

assertConfigured(config);
const result = await withV1Archive(config.archivePath, async (source) => {
  const data = await loadStoreData(source, config.legacyStoreId);
  process.stdout.write(
    `Loaded V1 store ${config.legacyStoreId}: ${data.vehicles.length} vehicles, ${data.leads.length} leads, ${data.sales.length} sales.\n`,
  );
  process.stdout.write(`Modules: foundation + ${[...modules].join(", ")}\n`);
  config.accessEmails = await promptForMissingAccessEmails(data, config);
  return migrateToV2(data, config);
});
process.stdout.write(
  result.applied
    ? `Migration applied. V2 store id: ${result.ids.store}\n`
    : "Dry run succeeded; all V2 writes were rolled back.\n",
);

// Module selection: --only=documents,leads runs just those modules;
// --skip=attachments runs everything except the listed ones. Foundation
// (tenant, store, users, billing) always runs. Skipped modules keep their
// previously migrated rows; links still resolve because target ids are
// deterministic.
function parseModuleArgs(argv) {
  let only = null;
  let skip = null;
  for (const arg of argv) {
    if (arg.startsWith("--only=")) only = arg.slice("--only=".length);
    else if (arg.startsWith("--skip=")) skip = arg.slice("--skip=".length);
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        `Usage: node tools/migration/migrate-v1-store.mjs [--only=${MIGRATION_MODULES.join("|")},...] [--skip=...]\n`,
      );
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (only !== null && skip !== null)
    throw new Error("Use either --only or --skip, not both.");
  const parseList = (value) =>
    value
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  const assertValid = (names) => {
    for (const name of names)
      if (!MIGRATION_MODULES.includes(name))
        throw new Error(
          `Unknown module "${name}". Valid modules: ${MIGRATION_MODULES.join(", ")}`,
        );
  };
  let names;
  if (only !== null) {
    names = parseList(only);
    assertValid(names);
  } else if (skip !== null) {
    const skipped = parseList(skip);
    assertValid(skipped);
    names = MIGRATION_MODULES.filter((module) => !skipped.includes(module));
  } else {
    names = MIGRATION_MODULES;
  }
  const selected = new Set(names);
  if (!selected.size) throw new Error("Module selection is empty.");
  return selected;
}

async function promptConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL in the environment before running.");
  }

  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const archivePath = await ask(terminal, "V1 archive path");
    const legacyStoreId = Number(await ask(terminal, "V1 store ID", "200"));
    const ownerClerkUserId = await ask(terminal, "Owner Clerk user id");
    const ownerEmail = await ask(terminal, "Owner email");
    const tenantLegalName = await ask(terminal, "Tenant legal name");
    const storeLegalName = await ask(terminal, "Store legal name");
    const storeTradingName = await ask(terminal, "Store trading name");
    const storeSlug = await ask(terminal, "Store slug");
    const apply = (await ask(terminal, "Apply writes? (y/n)", "n"))
      .trim()
      .toLowerCase()
      .startsWith("y");
    const confirmStoreSlug = apply
      ? await ask(terminal, "Confirm store slug (type exact slug)")
      : "";
    const allowRemoteTarget = (
      await ask(terminal, "Allow remote target? (y/n)", "y")
    )
      .trim()
      .toLowerCase()
      .startsWith("y");
    const availableVehicleSalePolicy = await ask(
      terminal,
      "Policy for available vehicle with a V1 sale",
      "cancelled",
    );

    return {
      allowRemoteTarget,
      apply,
      archivePath,
      availableVehicleSalePolicy,
      confirmStoreSlug,
      dumpLabel: `${new Date().toISOString().slice(0, 16)}:${basename(archivePath)}`,
      entitlements: DEFAULT_ENTITLEMENTS,
      legacyStoreId,
      ownerClerkUserId,
      ownerEmail,
      storeLegalName,
      storeSlug,
      storeTradingName,
      targetUrl: process.env.DATABASE_URL,
      tenantLegalName,
    };
  } finally {
    terminal.close();
  }
}

async function ask(terminal, label, fallback) {
  const suffix = fallback !== undefined ? ` [${fallback}]` : "";
  const answer = (await terminal.question(`${label}${suffix}: `)).trim();
  return answer || fallback || "";
}

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
