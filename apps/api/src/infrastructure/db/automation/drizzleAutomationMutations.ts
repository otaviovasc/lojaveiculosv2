import { and, eq, sql } from "drizzle-orm";
import {
  automationApprovals,
  automationRuns,
  automationSteps,
} from "@lojaveiculosv2/db";
import type {
  AutomationMutationResult,
  DecideAutomationStepRecordInput,
} from "../../../domains/automation/ports/automationRunRepository.js";
import type { DrizzleAutomationClient } from "./drizzleAutomationRunRepository.js";
import { findAutomationRunInDatabase } from "./drizzleAutomationReads.js";

class StaleAutomationMutation extends Error {}

export async function cancelAutomationRunInDatabase(
  db: DrizzleAutomationClient,
  input: {
    cancelledAt: Date;
    cancelledByActorId: string;
    expectedRunVersion: number;
    runId: string;
    storeId: string;
    tenantId: string;
  },
): Promise<AutomationMutationResult> {
  try {
    return await db.transaction(async (transaction) => {
      const tx = transaction as DrizzleAutomationClient;
      const [run] = await tx
        .update(automationRuns)
        .set({
          status: "cancelled",
          updatedAt: input.cancelledAt,
          version: sql`${automationRuns.version} + 1`,
        })
        .where(
          and(
            eq(automationRuns.id, input.runId),
            eq(automationRuns.storeId, input.storeId),
            eq(automationRuns.tenantId, input.tenantId),
            eq(automationRuns.status, "awaiting_approval"),
            eq(automationRuns.version, input.expectedRunVersion),
          ),
        )
        .returning({ id: automationRuns.id });
      if (!run) throw new StaleAutomationMutation();
      await Promise.all([
        tx
          .update(automationSteps)
          .set({
            status: "cancelled",
            updatedAt: input.cancelledAt,
            version: sql`${automationSteps.version} + 1`,
          })
          .where(pendingStepScope(input)),
        tx
          .update(automationApprovals)
          .set({
            decidedAt: input.cancelledAt,
            decidedByActorId: input.cancelledByActorId,
            status: "cancelled",
            updatedAt: input.cancelledAt,
            version: sql`${automationApprovals.version} + 1`,
          })
          .where(pendingApprovalScope(input)),
      ]);
      return updatedRun(tx, input);
    });
  } catch (error) {
    if (error instanceof StaleAutomationMutation) return { kind: "stale" };
    throw error;
  }
}

export async function decideAutomationStepInDatabase(
  db: DrizzleAutomationClient,
  input: DecideAutomationStepRecordInput,
): Promise<AutomationMutationResult> {
  try {
    return await db.transaction(async (transaction) => {
      const tx = transaction as DrizzleAutomationClient;
      const run = await updateDecisionRun(tx, input);
      const step = await updateDecisionStep(tx, input);
      const approval = await updateDecisionApproval(tx, input);
      if (!run || !step || !approval) throw new StaleAutomationMutation();
      return updatedRun(tx, input);
    });
  } catch (error) {
    if (error instanceof StaleAutomationMutation) return { kind: "stale" };
    throw error;
  }
}

async function updateDecisionRun(
  db: DrizzleAutomationClient,
  input: DecideAutomationStepRecordInput,
) {
  const [row] = await db
    .update(automationRuns)
    .set({
      status: input.runStatus,
      updatedAt: input.decidedAt,
      version: sql`${automationRuns.version} + 1`,
    })
    .where(
      and(
        eq(automationRuns.id, input.runId),
        eq(automationRuns.storeId, input.storeId),
        eq(automationRuns.tenantId, input.tenantId),
        eq(automationRuns.status, "awaiting_approval"),
        eq(automationRuns.version, input.expectedRunVersion),
      ),
    )
    .returning({ id: automationRuns.id });
  return row;
}

async function updateDecisionStep(
  db: DrizzleAutomationClient,
  input: DecideAutomationStepRecordInput,
) {
  const [row] = await db
    .update(automationSteps)
    .set({
      status: input.stepStatus,
      updatedAt: input.decidedAt,
      version: sql`${automationSteps.version} + 1`,
    })
    .where(
      and(
        eq(automationSteps.id, input.stepId),
        eq(automationSteps.runId, input.runId),
        eq(automationSteps.storeId, input.storeId),
        eq(automationSteps.tenantId, input.tenantId),
        eq(automationSteps.status, "awaiting_approval"),
        eq(automationSteps.version, input.expectedStepVersion),
      ),
    )
    .returning({ id: automationSteps.id });
  return row;
}

async function updateDecisionApproval(
  db: DrizzleAutomationClient,
  input: DecideAutomationStepRecordInput,
) {
  const [row] = await db
    .update(automationApprovals)
    .set({
      decidedAt: input.decidedAt,
      decidedByActorId: input.decidedByActorId,
      status: input.decision,
      updatedAt: input.decidedAt,
      version: sql`${automationApprovals.version} + 1`,
    })
    .where(
      and(
        eq(automationApprovals.id, input.approvalId),
        eq(automationApprovals.stepId, input.stepId),
        eq(automationApprovals.runId, input.runId),
        eq(automationApprovals.storeId, input.storeId),
        eq(automationApprovals.tenantId, input.tenantId),
        eq(automationApprovals.status, "pending"),
        eq(automationApprovals.version, input.expectedApprovalVersion),
        eq(automationApprovals.proposalDigest, input.expectedProposalDigest),
      ),
    )
    .returning({ id: automationApprovals.id });
  return row;
}

function pendingStepScope(input: {
  runId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(automationSteps.runId, input.runId),
    eq(automationSteps.storeId, input.storeId),
    eq(automationSteps.tenantId, input.tenantId),
    eq(automationSteps.status, "awaiting_approval"),
  );
}

function pendingApprovalScope(input: {
  runId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(automationApprovals.runId, input.runId),
    eq(automationApprovals.storeId, input.storeId),
    eq(automationApprovals.tenantId, input.tenantId),
    eq(automationApprovals.status, "pending"),
  );
}

async function updatedRun(
  db: DrizzleAutomationClient,
  input: { runId: string; storeId: string; tenantId: string },
): Promise<AutomationMutationResult> {
  const run = await findAutomationRunInDatabase(db, input);
  if (!run) throw new StaleAutomationMutation();
  return { kind: "updated", run };
}
