import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  automationApprovals,
  automationRuns,
  automationSteps,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  AutomationRunRepository,
  CreateAutomationPreviewRecordInput,
} from "../../../domains/automation/ports/automationRunRepository.js";
import {
  cancelAutomationRunInDatabase,
  decideAutomationStepInDatabase,
} from "./drizzleAutomationMutations.js";
import {
  findAutomationRunInDatabase,
  listAutomationRunsInDatabase,
} from "./drizzleAutomationReads.js";

export type DrizzleAutomationClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleAutomationRunRepository(
  db: DrizzleAutomationClient,
): AutomationRunRepository {
  return {
    cancel: (input) => cancelAutomationRunInDatabase(db, input),
    createPreview: (input) => createAutomationPreviewInDatabase(db, input),
    decideStep: (input) => decideAutomationStepInDatabase(db, input),
    findById: (input) => findAutomationRunInDatabase(db, input),
    list: (input) => listAutomationRunsInDatabase(db, input),
  };
}

async function createAutomationPreviewInDatabase(
  db: DrizzleAutomationClient,
  input: CreateAutomationPreviewRecordInput,
) {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleAutomationClient;
    await tx.insert(automationRuns).values({
      context: input.context,
      createdAt: input.createdAt,
      createdByActorId: input.createdByActorId,
      executionEnabled: false,
      id: input.runId,
      objective: input.objective,
      status: "awaiting_approval",
      storeId: input.storeId,
      tenantId: input.tenantId,
      updatedAt: input.createdAt,
      version: 1,
    });
    await tx.insert(automationSteps).values({
      createdAt: input.createdAt,
      executionEnabled: false,
      id: input.stepId,
      kind: "read_only_preview",
      position: 1,
      risk: "low",
      runId: input.runId,
      status: "awaiting_approval",
      storeId: input.storeId,
      summary: input.stepSummary,
      tenantId: input.tenantId,
      title: input.stepTitle,
      updatedAt: input.createdAt,
      version: 1,
    });
    await tx.insert(automationApprovals).values({
      createdAt: input.createdAt,
      id: input.approvalId,
      proposalDigest: input.proposalDigest,
      runId: input.runId,
      status: "pending",
      stepId: input.stepId,
      storeId: input.storeId,
      tenantId: input.tenantId,
      updatedAt: input.createdAt,
      version: 1,
    });
    const run = await findAutomationRunInDatabase(tx, input);
    if (!run) throw new Error("Automation preview insert failed.");
    return run;
  });
}
