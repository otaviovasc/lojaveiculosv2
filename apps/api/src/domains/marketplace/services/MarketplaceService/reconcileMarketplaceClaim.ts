import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  MarketplaceJobScope,
  MarketplaceReconciliationClaim,
} from "../../ports/marketplaceRepository.js";
import { readMarketplaceAccountToken } from "./marketplaceAccountPreflight.js";
import {
  auditReconciliationOutcome,
  isOperationExpired,
  isTerminalFailure,
  isTerminalSuccess,
  reconciliationDelay,
  reconciliationExternalId,
  reconciliationListId,
  reconciliationListingId,
  requireReconciliationGateway,
  safeReconciliationMetadata,
  terminalErrorMessage,
  transientReconciliationMetadata,
} from "./marketplaceReconciliationSupport.js";
import type { MarketplaceServicePorts } from "./serviceSupport.js";

export async function reconcileMarketplaceClaim(
  context: ServiceContext,
  claim: MarketplaceReconciliationClaim,
  now: Date,
  scope: MarketplaceJobScope,
  ports: MarketplaceServicePorts,
) {
  const job = claim.job;
  const listingId = reconciliationListingId(job);
  const externalId = reconciliationExternalId(job);
  const account = await ports.marketplaceRepository.findAccountById({
    accountId: job.accountId,
    ...scope,
  });
  const gateway = ports.gatewayRegistry?.getGateway(job.provider);
  const reconcile = requireReconciliationGateway(gateway);
  if (!listingId || !externalId || !account || !reconcile) {
    return requireManualRecovery(claim, now, scope, ports);
  }

  try {
    const outcome = await reconcile({
      externalId,
      jobType: job.jobType,
      listId: reconciliationListId(job),
      operationToken: claim.operationToken,
      token: readMarketplaceAccountToken(account, job.provider),
    });
    const metadata = safeReconciliationMetadata(job, outcome, now);
    if (isTerminalSuccess(job, outcome)) {
      const completed = await ports.marketplaceRepository.completeSubmittedJob({
        completedAt: now,
        externalId,
        jobId: job.id,
        leaseOwner: claim.leaseOwner,
        listingId,
        metadata,
        provider: job.provider,
        ...scope,
      });
      await auditReconciliationOutcome(context, completed, outcome.state);
      return completed ?? job;
    }
    if (isTerminalFailure(outcome)) {
      const failed = await ports.marketplaceRepository.failSubmittedJob({
        completedAt: now,
        errorMessage: terminalErrorMessage(outcome),
        jobId: job.id,
        leaseOwner: claim.leaseOwner,
        metadata,
        ...scope,
      });
      await auditReconciliationOutcome(context, failed, outcome.state);
      return failed ?? job;
    }
    return rescheduleResult(claim, now, scope, ports, metadata);
  } catch (error) {
    return rescheduleResult(
      claim,
      now,
      scope,
      ports,
      transientReconciliationMetadata(job, now, error),
      error,
    );
  }
}

async function requireManualRecovery(
  claim: MarketplaceReconciliationClaim,
  now: Date,
  scope: MarketplaceJobScope,
  ports: MarketplaceServicePorts,
) {
  return reschedule(
    claim,
    now,
    scope,
    ports,
    transientReconciliationMetadata(claim.job, now, null, {
      reconciliationMessage:
        "A confirmação automática não está disponível. Não reenvie; reconecte a conta e consulte novamente.",
    }),
    null,
  );
}

function rescheduleResult(
  claim: MarketplaceReconciliationClaim,
  now: Date,
  scope: MarketplaceJobScope,
  ports: MarketplaceServicePorts,
  metadata: Record<string, unknown>,
  error?: unknown,
) {
  const expired = isOperationExpired(claim, now);
  return reschedule(
    claim,
    now,
    scope,
    ports,
    expired ? expiredReconciliationMetadata(metadata) : metadata,
    expired ? null : undefined,
    error,
  );
}

function expiredReconciliationMetadata(metadata: Record<string, unknown>) {
  return {
    ...metadata,
    reconciliationMessage:
      "A OLX não confirmou a operação dentro do prazo. Não reenvie automaticamente; consulte o canal ou refaça a operação após verificar o anúncio.",
    reconciliationRequired: true,
  };
}

async function reschedule(
  claim: MarketplaceReconciliationClaim,
  now: Date,
  scope: MarketplaceJobScope,
  ports: MarketplaceServicePorts,
  metadata: Record<string, unknown>,
  nextAttemptAt?: Date | null,
  error?: unknown,
) {
  const scheduled = await ports.marketplaceRepository.rescheduleSubmittedJob({
    checkedAt: now,
    jobId: claim.job.id,
    leaseOwner: claim.leaseOwner,
    metadata,
    nextAttemptAt:
      nextAttemptAt === null
        ? null
        : new Date(now.getTime() + reconciliationDelay(claim, error)),
    ...scope,
  });
  return scheduled ?? claim.job;
}
