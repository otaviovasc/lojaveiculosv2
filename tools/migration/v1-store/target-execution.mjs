import {
  executeCheckpointedStage,
  stageCheckpointVersion,
} from "./target-checkpoints.mjs";
import {
  finalizeMigrationRun,
  initializeMigrationRun,
  recordMigrationFailure,
  saveStageCheckpoint,
} from "./target-checkpoint-storage.mjs";
import { log, migrationErrorSummary, withTimer } from "./log.mjs";
import { seedFoundation } from "./target-foundation.mjs";
import { seedCrm, seedInventory } from "./target-inventory-crm.mjs";
import {
  seedDocumentsAndFiscal,
  seedSalesAndFinance,
} from "./target-commerce.mjs";
import { seedFinanceAttachments } from "./target-attachments.mjs";
import { seedCrmWhatsapp } from "./target-crm-whatsapp.mjs";
import { assertParity, collectParity } from "./target-parity.mjs";
import { reconcileLegacyProjection } from "./target-reconciliation.mjs";
import { seedSpedyFiscalConnection } from "./spedy-fiscal.mjs";

class DryRunRollback extends Error {}

export async function runAppliedMigration(input) {
  const { config, fingerprint, ids, modules, sql } = input;
  const checkpoints = await initializeMigrationRun(
    sql,
    config,
    ids,
    modules,
    fingerprint,
  );
  log(`Migration run id: ${ids.run}`);
  log(
    `Durable checkpoints enabled (${Object.keys(checkpoints).length} previously committed stage(s) found).`,
  );

  for (const stage of createStages(input)) {
    const expected = {
      fingerprint,
      version: stageCheckpointVersion(stage.key),
    };
    const result = await executeCheckpointedStage({
      checkpoint: checkpoints[stage.key],
      executeTransaction: (completedCheckpoint) =>
        sql.begin(async (tx) => {
          await stage.execute(tx);
          await saveStageCheckpoint(
            tx,
            ids.run,
            stage.key,
            completedCheckpoint,
          );
        }),
      expected,
      label: stage.label,
      onFailure: (error) =>
        recordFailureWithoutMasking(sql, ids.run, stage.key, error),
      resume: config.resumeCompletedStages,
      stageKey: stage.key,
    });
    checkpoints[stage.key] = result.checkpoint;
  }

  try {
    await sql.begin(async (tx) => {
      const parity = await withTimer("Parity check", () =>
        collectParity(tx, ids.store, ids),
      );
      assertParity(input.data, parity, modules);
      await finalizeMigrationRun(
        tx,
        ids.run,
        successfulRunMetadata(input.data, parity),
      );
    });
  } catch (error) {
    await recordFailureWithoutMasking(sql, ids.run, "parity", error);
    throw error;
  }
}

export async function runDryRunMigration(input) {
  const { config, fingerprint, ids, modules, sql } = input;
  try {
    await sql.begin(async (tx) => {
      await initializeMigrationRun(tx, config, ids, modules, fingerprint);
      log(`Migration run id: ${ids.run}`);
      for (const stage of createStages(input))
        await withTimer(stage.label, () => stage.execute(tx));
      const parity = await withTimer("Parity check", () =>
        collectParity(tx, ids.store, ids),
      );
      assertParity(input.data, parity, modules);
      await finalizeMigrationRun(
        tx,
        ids.run,
        successfulRunMetadata(input.data, parity),
      );
      throw new DryRunRollback("Dry run completed and rolled back.");
    });
  } catch (error) {
    if (error instanceof DryRunRollback) return;
    throw error;
  }
}

export function createStages({ config, data, ids, modules, uploader }) {
  return [
    {
      execute: (tx) =>
        reconcileLegacyProjection(tx, data, config, ids, modules),
      key: "reconciliation",
      label: "Reconcile prior V1 projection",
    },
    {
      execute: (tx) => seedFoundation(tx, data, config, ids),
      key: "foundation",
      label: "Foundation (tenant, store, users, entitlements, billing)",
    },
    {
      execute: (tx) => seedSpedyFiscalConnection(tx, data.spedyFiscal, ids),
      key: "fiscal",
      label: "Fiscal provider connection",
    },
    modules.has("vehicles") && {
      execute: (tx) => seedInventory(tx, data, config, ids),
      key: "inventory",
      label: "Inventory (vehicles, media, checklists)",
    },
    modules.has("leads") && {
      execute: (tx) => seedCrm(tx, data, config, ids),
      key: "crm",
      label: "CRM (leads, activities, interests)",
    },
    modules.has("sales") && {
      execute: (tx) => seedSalesAndFinance(tx, data, config, ids),
      key: "sales",
      label: "Sales & finance",
    },
    modules.has("documents") && {
      execute: (tx) => seedDocumentsAndFiscal(tx, data, config, ids, uploader),
      key: "documents",
      label: "Documents & fiscal",
    },
    modules.has("attachments") && {
      execute: (tx) => seedFinanceAttachments(tx, data, config, ids),
      key: "attachments",
      label: "Finance attachments",
    },
    modules.has("whatsapp") && {
      execute: (tx) => seedCrmWhatsapp(tx, data, config, ids),
      key: "whatsapp",
      label: "CRM WhatsApp (connections, sessions, messages, media URLs)",
    },
  ].filter(Boolean);
}

function successfulRunMetadata(data, parity) {
  return {
    billing: {
      addonTypes: data.billing.addons.map((addon) => addon.addonType),
      legacyPlan: data.billing.legacyPlan,
      paymentCount: data.billing.payments.length,
      subscriptionStatus: data.billing.subscription.status,
    },
    parity,
    preservedStoreConfiguration: {
      customModels: data.customModels,
      saleSources: data.saleSources,
      settings: data.settings,
    },
  };
}

async function recordFailureWithoutMasking(sql, runId, stageKey, error) {
  try {
    await recordMigrationFailure(sql, runId, stageKey, error);
  } catch (recordError) {
    log(
      `  Could not persist migration failure status: ${migrationErrorSummary(recordError)}`,
    );
  }
}
