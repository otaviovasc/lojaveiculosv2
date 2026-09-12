#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  assertFiscalCredentialRepairSafety,
  prepareFiscalCredentialRepair,
} from "./v1-store/fiscal-credential-repair.mjs";

class DryRunRollback extends Error {}

const config = parseArgs(process.argv.slice(2));
if (config.help) {
  printHelp();
  process.exit(0);
}

const targetUrl = requiredEnv("DATABASE_URL");
const oldKey = requiredEnv("FISCAL_CREDENTIAL_OLD_ENCRYPTION_KEY");
const targetKey = requiredEnv("FISCAL_CREDENTIAL_ENCRYPTION_KEY");
assertFiscalCredentialRepairSafety({ ...config, targetUrl });

const target = new URL(targetUrl);
const local = ["127.0.0.1", "localhost", "::1"].includes(target.hostname);
const sql = postgres(targetUrl, {
  max: 1,
  prepare: false,
  ssl: local ? false : { rejectUnauthorized: false },
});

try {
  const result = await repairCredential(sql, config, oldKey, targetKey);
  process.stdout.write(
    result.alreadyUsesTargetKey
      ? "Fiscal credential already uses the target key; no write was needed.\n"
      : config.apply
        ? `Fiscal credential re-encrypted for store ${config.storeId}.\n`
        : "Dry run succeeded; the credential can be re-encrypted with the target key.\n",
  );
} catch (error) {
  if (error instanceof DryRunRollback) {
    process.stdout.write(
      "Dry run succeeded; the credential can be re-encrypted with the target key.\n",
    );
  } else {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}

async function repairCredential(sql, config, oldKey, targetKey) {
  let result;
  await sql.begin(async (tx) => {
    const [row] = await tx`
      SELECT credential_ciphertext
      FROM fiscal_provider_connections
      WHERE store_id = ${config.storeId} AND provider = 'spedy'
      FOR UPDATE
    `;
    if (!row?.credential_ciphertext) {
      throw new Error("No encrypted Spedy credential exists for this store.");
    }
    result = prepareFiscalCredentialRepair(
      row.credential_ciphertext,
      oldKey,
      targetKey,
    );
    if (result.alreadyUsesTargetKey) return;
    await tx`
      UPDATE fiscal_provider_connections
      SET credential_ciphertext = ${result.credentialCiphertext},
          updated_at = now()
      WHERE store_id = ${config.storeId} AND provider = 'spedy'
    `;
    await tx`
      INSERT INTO migration_runs
        (id, dump_label, metadata, started_at, completed_at, status,
         created_at, updated_at)
      VALUES (
        ${randomUUID()},
        'fiscal-credential-key-repair',
        ${tx.json({
          provider: "spedy",
          source: "operator-repair",
          storeId: config.storeId,
        })},
        now(), now(), 'succeeded', now(), now()
      )
    `;
    if (!config.apply) throw new DryRunRollback();
  });
  return result;
}

function parseArgs(args) {
  const config = {
    allowRemoteTarget: false,
    apply: false,
    confirmStoreId: "",
    help: false,
    storeId: "",
  };
  for (const arg of args) {
    if (arg === "--") continue;
    if (arg === "--allow-remote-target") config.allowRemoteTarget = true;
    else if (arg === "--apply") config.apply = true;
    else if (arg === "--help" || arg === "-h") config.help = true;
    else if (arg.startsWith("--confirm-store-id="))
      config.confirmStoreId = arg.slice("--confirm-store-id=".length);
    else if (arg.startsWith("--store-id="))
      config.storeId = arg.slice("--store-id=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!config.help && !/^[0-9a-f-]{36}$/i.test(config.storeId)) {
    throw new Error("--store-id must be a UUID.");
  }
  return config;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be explicitly exported.`);
  return value;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: pnpm run migration:repair-fiscal-credential -- \\",
      "  --store-id=<uuid> [--allow-remote-target] [--apply \\",
      "  --confirm-store-id=<same-uuid>]",
      "",
      "Required exported variables:",
      "  DATABASE_URL",
      "  FISCAL_CREDENTIAL_OLD_ENCRYPTION_KEY",
      "  FISCAL_CREDENTIAL_ENCRYPTION_KEY",
      "",
      "The command is a transactionally rolled-back dry run unless --apply is used.",
      "",
    ].join("\n"),
  );
}
