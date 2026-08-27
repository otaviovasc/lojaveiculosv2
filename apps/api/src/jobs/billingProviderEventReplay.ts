import { randomUUID } from "node:crypto";
import * as productSchema from "@lojaveiculosv2/db";
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { processBillingProviderWebhook } from "../domains/billing/services/BillingService/processBillingProviderWebhook.js";
import type { DrizzleBillingClient } from "../infrastructure/db/billing/drizzleBillingRepository.js";
import type { AuditSink } from "../shared/auditSink.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";
import {
  billingProviderEventCanReplay,
  orderReplayCandidates,
  providerEventBatchSize,
  providerEventExhaustedError,
  providerEventMaxAttempts,
  providerEventProcessingLeaseMs,
  providerEventRetryBaseMs,
  providerEventRetryMaxMs,
} from "./billingProviderEventReplayPolicy.js";

const logger = createConsoleServiceLogger({
  component: "job.billing-provider-event-replay",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

export async function replayPendingProviderEvents(
  input: {
    audit?: AuditSink;
    db: DrizzleBillingClient;
    environment: string;
    ports: Parameters<typeof processBillingProviderWebhook>[2];
  },
  now: Date = new Date(),
) {
  const exhausted = await markExhaustedProviderEvents(
    input.db,
    input.environment,
    now,
  );
  if (exhausted.length) {
    logger.error("alert.billing_provider_event_replay.exhausted", {
      count: exhausted.length,
      providerEventRecordIds: exhausted.map((event) => event.id),
    });
  }
  const webhookToken = process.env.ASAAS_WEBHOOK_SECRET ?? null;
  if (!webhookToken) return 0;
  const events = await billingProviderEventReplayCandidatesQuery(
    input.db,
    input.environment,
    now,
  );
  let replayed = 0;
  for (const event of orderReplayCandidates(events).filter((candidate) =>
    billingProviderEventCanReplay(candidate, now),
  )) {
    try {
      const result = await processBillingProviderWebhook(
        createServiceContext({
          actor: { id: "billing_provider_event_replay", kind: "system" },
          ...(input.audit ? { audit: input.audit } : {}),
          logger,
          permissions: ["billing.webhook.ingest"],
          request: { requestId: `billing_event_replay_${randomUUID()}` },
          source: {
            component: "billing-provider-event-replay",
            service: "api",
          },
        }),
        {
          payload: event.payload as Record<string, unknown>,
          provider: "asaas",
          webhookToken,
        },
        input.ports,
      );
      if (result.status === "processed") replayed += 1;
    } catch (error) {
      logger.error("job.billing_provider_event_replay.failed", {
        errorName: error instanceof Error ? error.name : "Error",
        providerEventRecordId: event.id,
      });
    }
  }
  return replayed;
}

export async function requeueExhaustedProviderEvent(input: {
  db: DrizzleBillingClient;
  environment: string;
  eventId: string;
  now?: Date;
}) {
  const [requeued] = await input.db
    .update(productSchema.providerEvents)
    .set({
      errorMessage: null,
      processedAt: null,
      processingAttempts: 0,
      processingStartedAt: null,
      processingToken: null,
      status: "pending_reconciliation",
      updatedAt: input.now ?? new Date(),
    })
    .where(
      and(
        eq(productSchema.providerEvents.id, input.eventId),
        eq(productSchema.providerEvents.provider, "asaas"),
        eq(productSchema.providerEvents.environment, input.environment),
        eq(productSchema.providerEvents.status, "failed"),
        eq(
          productSchema.providerEvents.errorMessage,
          providerEventExhaustedError,
        ),
        gte(
          productSchema.providerEvents.processingAttempts,
          providerEventMaxAttempts,
        ),
      ),
    )
    .returning({ id: productSchema.providerEvents.id });
  return Boolean(requeued);
}

export function billingProviderEventReplayCandidatesQuery(
  db: DrizzleBillingClient,
  environment: string,
  now: Date,
) {
  return db
    .select({
      createdAt: productSchema.providerEvents.createdAt,
      id: productSchema.providerEvents.id,
      payload: productSchema.providerEvents.payload,
      processingAttempts: productSchema.providerEvents.processingAttempts,
      processingStartedAt: productSchema.providerEvents.processingStartedAt,
      status: productSchema.providerEvents.status,
      updatedAt: productSchema.providerEvents.updatedAt,
    })
    .from(productSchema.providerEvents)
    .where(
      and(
        eq(productSchema.providerEvents.provider, "asaas"),
        eq(productSchema.providerEvents.environment, environment),
        lt(
          productSchema.providerEvents.processingAttempts,
          providerEventMaxAttempts,
        ),
        or(
          and(
            inArray(productSchema.providerEvents.status, [
              "failed",
              "pending_reconciliation",
            ]),
            sql`${productSchema.providerEvents.updatedAt} + make_interval(secs => least(${providerEventRetryMaxMs / 1_000}, ${providerEventRetryBaseMs / 1_000} * power(2, greatest(${productSchema.providerEvents.processingAttempts} - 1, 0)))) <= ${sql.param(now, productSchema.providerEvents.updatedAt)}`,
          ),
          and(
            eq(productSchema.providerEvents.status, "processing"),
            or(
              isNull(productSchema.providerEvents.processingStartedAt),
              lte(
                productSchema.providerEvents.processingStartedAt,
                new Date(now.getTime() - providerEventProcessingLeaseMs),
              ),
            ),
          ),
        ),
      ),
    )
    .orderBy(
      asc(productSchema.providerEvents.updatedAt),
      asc(productSchema.providerEvents.createdAt),
      asc(productSchema.providerEvents.id),
    )
    .limit(providerEventBatchSize);
}

async function markExhaustedProviderEvents(
  db: DrizzleBillingClient,
  environment: string,
  now: Date,
) {
  return db
    .update(productSchema.providerEvents)
    .set({
      errorMessage: providerEventExhaustedError,
      processedAt: now,
      processingStartedAt: null,
      processingToken: null,
      status: "failed",
      updatedAt: now,
    })
    .where(
      and(
        eq(productSchema.providerEvents.provider, "asaas"),
        eq(productSchema.providerEvents.environment, environment),
        gte(
          productSchema.providerEvents.processingAttempts,
          providerEventMaxAttempts,
        ),
        or(
          inArray(productSchema.providerEvents.status, [
            "failed",
            "pending_reconciliation",
          ]),
          and(
            eq(productSchema.providerEvents.status, "processing"),
            or(
              isNull(productSchema.providerEvents.processingStartedAt),
              lte(
                productSchema.providerEvents.processingStartedAt,
                new Date(now.getTime() - providerEventProcessingLeaseMs),
              ),
            ),
          ),
        ),
        or(
          isNull(productSchema.providerEvents.errorMessage),
          ne(
            productSchema.providerEvents.errorMessage,
            providerEventExhaustedError,
          ),
        ),
      ),
    )
    .returning({ id: productSchema.providerEvents.id });
}
