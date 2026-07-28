import { createHash } from "node:crypto";
import { log, withTimer } from "./log.mjs";

// Bump the affected stage when its mapping behavior changes. Dependency
// versions are folded into downstream versions automatically.
const STAGE_VERSIONS = {
  attachments: 1,
  crm: 1,
  documents: 1,
  fiscal: 1,
  foundation: 1,
  inventory: 1,
  reconciliation: 1,
  sales: 1,
  whatsapp: 1,
};

const STAGE_DEPENDENCIES = {
  attachments: ["foundation", "sales"],
  crm: ["foundation", "inventory"],
  documents: ["foundation", "fiscal", "inventory", "crm", "sales"],
  fiscal: ["foundation"],
  foundation: [],
  inventory: ["foundation"],
  reconciliation: [],
  sales: ["foundation", "inventory", "crm"],
  whatsapp: ["foundation", "crm"],
};

export function createMigrationFingerprint(data, config, modules) {
  const outputConfig = {
    accessEmails: [...(config.accessEmails ?? new Map()).entries()].sort(
      ([left], [right]) => String(left).localeCompare(String(right)),
    ),
    activateWhatsappConnections: config.activateWhatsappConnections,
    availableVehicleSalePolicy: config.availableVehicleSalePolicy,
    legacyStoreId: config.legacyStoreId,
    modules: [...modules].sort(),
    ownerClerkUserId: config.ownerClerkUserId,
    ownerEmail: config.ownerEmail,
    replaceWhatsappHistory: config.replaceWhatsappHistory,
    storeLegalName: config.storeLegalName,
    storeSlug: config.storeSlug,
    storeTradingName: config.storeTradingName,
    tenantLegalName: config.tenantLegalName,
  };
  return createHash("sha256")
    .update(serializeForFingerprint(data))
    .update("\u0000")
    .update(serializeForFingerprint(outputConfig))
    .digest("hex");
}

export function stageCheckpointVersion(stageKey) {
  if (!(stageKey in STAGE_VERSIONS))
    throw new Error(`Unknown migration checkpoint stage: ${stageKey}`);
  return createHash("sha256")
    .update(stageVersionInput(stageKey, new Set()))
    .digest("hex")
    .slice(0, 16);
}

export function checkpointMatches(checkpoint, expected) {
  return Boolean(
    checkpoint &&
    checkpoint.fingerprint === expected.fingerprint &&
    checkpoint.version === expected.version,
  );
}

export async function executeCheckpointedStage({
  checkpoint,
  executeTransaction,
  expected,
  label,
  onFailure,
  resume,
  stageKey,
}) {
  if (resume && checkpointMatches(checkpoint, expected)) {
    log(`↷ ${label} already committed at ${checkpoint.completedAt}; skipping`);
    return { checkpoint, skipped: true };
  }

  const completedCheckpoint = {
    ...expected,
    completedAt: new Date().toISOString(),
  };
  try {
    await withTimer(label, () => executeTransaction(completedCheckpoint));
    return { checkpoint: completedCheckpoint, skipped: false };
  } catch (error) {
    await onFailure?.(error, stageKey);
    throw error;
  }
}

function stageVersionInput(stageKey, visiting) {
  if (visiting.has(stageKey))
    throw new Error(`Circular migration checkpoint dependency: ${stageKey}`);
  const next = new Set(visiting).add(stageKey);
  const dependencies = STAGE_DEPENDENCIES[stageKey]
    .map((dependency) => stageVersionInput(dependency, next))
    .join(",");
  return `${stageKey}@${STAGE_VERSIONS[stageKey]}[${dependencies}]`;
}

function serializeForFingerprint(value) {
  return JSON.stringify(value, (key, nested) => {
    if (key === "billing" || key === "spedyFiscal") return undefined;
    if (typeof nested === "bigint") return `${nested}n`;
    if (nested instanceof Map)
      return [...nested.entries()].sort(([left], [right]) =>
        String(left).localeCompare(String(right)),
      );
    if (nested instanceof Set) return [...nested].sort();
    return nested;
  });
}
