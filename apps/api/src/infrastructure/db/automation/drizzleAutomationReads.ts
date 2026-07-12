import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  automationApprovals,
  automationRuns,
  automationSteps,
} from "@lojaveiculosv2/db";
import type {
  AutomationRun,
  AutomationRunList,
} from "../../../domains/automation/models.js";
import type { DrizzleAutomationClient } from "./drizzleAutomationRunRepository.js";
import { toAutomationRun } from "./drizzleAutomationMappers.js";

export async function findAutomationRunInDatabase(
  db: DrizzleAutomationClient,
  input: { runId: string; storeId: string; tenantId: string },
): Promise<AutomationRun | null> {
  const [runRow] = await db
    .select()
    .from(automationRuns)
    .where(
      and(
        eq(automationRuns.id, input.runId),
        eq(automationRuns.storeId, input.storeId),
        eq(automationRuns.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!runRow) return null;
  const [stepRows, approvalRows] = await Promise.all([
    db
      .select()
      .from(automationSteps)
      .where(
        and(
          eq(automationSteps.runId, runRow.id),
          eq(automationSteps.storeId, input.storeId),
          eq(automationSteps.tenantId, input.tenantId),
        ),
      )
      .orderBy(automationSteps.position),
    db
      .select()
      .from(automationApprovals)
      .where(
        and(
          eq(automationApprovals.runId, runRow.id),
          eq(automationApprovals.storeId, input.storeId),
          eq(automationApprovals.tenantId, input.tenantId),
        ),
      ),
  ]);
  return toAutomationRun(runRow, stepRows, approvalRows);
}

export async function listAutomationRunsInDatabase(
  db: DrizzleAutomationClient,
  input: { limit: number; offset: number; storeId: string; tenantId: string },
): Promise<AutomationRunList> {
  const scope = and(
    eq(automationRuns.storeId, input.storeId),
    eq(automationRuns.tenantId, input.tenantId),
  );
  const [runRows, totalRows] = await Promise.all([
    db
      .select()
      .from(automationRuns)
      .where(scope)
      .orderBy(desc(automationRuns.createdAt), desc(automationRuns.id))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ value: count() }).from(automationRuns).where(scope),
  ]);
  const runIds = runRows.map((run) => run.id);
  const [stepRows, approvalRows] = runIds.length
    ? await Promise.all([
        db
          .select({ runId: automationSteps.runId })
          .from(automationSteps)
          .where(
            and(
              inArray(automationSteps.runId, runIds),
              eq(automationSteps.storeId, input.storeId),
              eq(automationSteps.tenantId, input.tenantId),
            ),
          ),
        db
          .select({ runId: automationApprovals.runId })
          .from(automationApprovals)
          .where(
            and(
              inArray(automationApprovals.runId, runIds),
              eq(automationApprovals.storeId, input.storeId),
              eq(automationApprovals.tenantId, input.tenantId),
              eq(automationApprovals.status, "pending"),
            ),
          ),
      ])
    : [[], []];
  return {
    items: runRows.map((run) => {
      const steps = stepRows.filter((step) => step.runId === run.id);
      return {
        createdAt: run.createdAt,
        createdByActorId: run.createdByActorId,
        executionEnabled: false,
        id: run.id,
        objective: run.objective,
        pendingApprovalCount: approvalRows.filter(
          (approval) => approval.runId === run.id,
        ).length,
        status: run.status,
        stepCount: steps.length,
        storeId: run.storeId as never,
        tenantId: run.tenantId as never,
        updatedAt: run.updatedAt,
        version: run.version,
      };
    }),
    limit: input.limit,
    offset: input.offset,
    total: totalRows[0]?.value ?? 0,
  };
}
