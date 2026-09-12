import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { BillingProviderReconciliationTask } from "../../ports/billingProviderReconciliation.js";
import type { BillingServicePorts } from "./serviceSupport.js";
import { syncBillingProviderSubscription } from "./syncBillingProviderSubscription.js";

export type BillingProviderReconciliationResult =
  | { status: "idle" }
  | {
      reconciliationId: string;
      status: "retry" | "succeeded";
      subscriptionId: string;
    };

export async function reconcileNextBillingProvider(
  context: ServiceContext,
  input: { now: Date; processingToken: string },
  ports: BillingServicePorts,
): Promise<BillingProviderReconciliationResult> {
  assertPermission(context, "billing.manage");
  context.logger.info(
    "billing.provider_reconciliation.claim.started",
    createServiceLogMetadata(context),
  );
  const repository = ports.billingProviderReconciliationRepository;
  if (!repository)
    throw new Error("Billing reconciliation repository is required.");
  const task = await repository.claimNext({
    now: input.now,
    processingToken: input.processingToken,
    staleBefore: new Date(input.now.getTime() - 10 * 60_000),
  });
  if (!task) return { status: "idle" };

  const taskContext = tenantWorkerContext(context, task);
  taskContext.logger.info(
    "billing.provider_reconciliation.started",
    createServiceLogMetadata(taskContext, taskMetadata(task)),
  );
  try {
    const result =
      task.kind === "subscription_cancellation"
        ? await cancelProviderSubscription(task, ports)
        : await reconcileProviderSubscription(taskContext, task, ports);
    if (
      result.nextDueDate &&
      result.nextDueDate !== billingDate(task.nextDueAt)
    ) {
      throw new Error("Provider changed the billing renewal date.");
    }
    const completed = await repository.markSucceeded({
      ...(task.kind === "subscription_cancellation" &&
      task.targetProviderSubscriptionId
        ? {
            cancelledProviderSubscriptionId: task.targetProviderSubscriptionId,
          }
        : {}),
      completedAt: input.now,
      processingToken: task.processingToken,
      reconciliationId: task.id,
    });
    if (!completed) throw new Error("Billing reconciliation claim was lost.");
    await recordAudit(taskContext, task, "succeeded", result.chargeTotalCents);
    taskContext.logger.info(
      "billing.provider_reconciliation.completed",
      createServiceLogMetadata(taskContext, {
        ...taskMetadata(task),
        chargeTotalCents: result.chargeTotalCents,
      }),
    );
    return {
      reconciliationId: task.id,
      status: "succeeded",
      subscriptionId: task.subscriptionId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await repository.markRetry({
      availableAt: retryAt(input.now, task.attemptCount),
      errorMessage,
      processingToken: task.processingToken,
      reconciliationId: task.id,
    });
    await recordAudit(taskContext, task, "failed", null, errorMessage);
    taskContext.logger.error(
      "billing.provider_reconciliation.retry_scheduled",
      createServiceLogMetadata(taskContext, {
        ...taskMetadata(task),
        errorMessage,
      }),
    );
    return {
      reconciliationId: task.id,
      status: "retry",
      subscriptionId: task.subscriptionId,
    };
  }
}

async function reconcileProviderSubscription(
  context: ServiceContext,
  task: BillingProviderReconciliationTask,
  ports: BillingServicePorts,
) {
  return syncBillingProviderSubscription(
    context,
    {
      cancelWhenEmpty: true,
      nextDueDate: task.nextDueAt,
      updatePendingPayments: true,
    },
    ports,
  );
}

async function cancelProviderSubscription(
  task: BillingProviderReconciliationTask,
  ports: BillingServicePorts,
) {
  if (task.targetProviderSubscriptionId) {
    const cancelSubscription = ports.paymentProviderGateway?.cancelSubscription;
    if (!cancelSubscription) {
      throw new Error("Provider subscription cancellation is unavailable.");
    }
    await cancelSubscription(task.targetProviderSubscriptionId);
  }
  return { chargeTotalCents: 0, nextDueDate: null };
}

function tenantWorkerContext(
  context: ServiceContext,
  task: BillingProviderReconciliationTask,
): ServiceContext {
  return {
    ...context,
    billingManagedBy: "agency",
    storeId: task.storeId,
    tenantId: task.tenantId,
  };
}

function retryAt(now: Date, attemptCount: number) {
  const minutes = Math.min(360, 2 ** Math.min(attemptCount, 8));
  return new Date(now.getTime() + minutes * 60_000);
}

function billingDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function taskMetadata(task: BillingProviderReconciliationTask) {
  return {
    attemptCount: task.attemptCount,
    kind: task.kind,
    reconciliationId: task.id,
    storeId: task.storeId,
    subscriptionId: task.subscriptionId,
  };
}

async function recordAudit(
  context: ServiceContext,
  task: BillingProviderReconciliationTask,
  outcome: "failed" | "succeeded",
  chargeTotalCents: number | null,
  errorMessage?: string,
) {
  await context.audit.record({
    action: `billing.provider_reconciliation.${outcome}`,
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: task.id,
    entityType: "billing_provider_reconciliation",
    metadata: {
      chargeTotalCents,
      errorMessage: errorMessage ?? null,
      kind: task.kind,
      subscriptionId: task.subscriptionId,
    },
    outcome,
    requestId: context.requestId,
    storeId: task.storeId,
    tenantId: task.tenantId,
    summary: "Reconciled server-owned Asaas recurring billing",
  });
}
