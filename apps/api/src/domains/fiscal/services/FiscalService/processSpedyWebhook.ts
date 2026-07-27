import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { mapProviderStatus } from "../../documents/fiscalIssuePayload.js";
import type { FiscalWebhookRepository } from "../../ports/fiscalWebhookRepository.js";
import { parseSpedyWebhook } from "../../readModels/spedyWebhook.js";
import type { FiscalServicePorts } from "./serviceSupport.js";

export type SpedyWebhookPorts = FiscalServicePorts & {
  fiscalWebhookRepository: FiscalWebhookRepository;
};

export async function processSpedyWebhook(
  context: ServiceContext,
  input: { payload: Record<string, unknown>; token: string },
  ports: SpedyWebhookPorts,
) {
  assertPermission(context, "fiscal.webhook.ingest");
  if (!ports.fiscalProviderAdminGateway.verifyWebhookToken(input.token)) {
    throw new SpedyWebhookTokenError();
  }
  const webhook = parseSpedyWebhook(input.payload);
  context.logger.info(
    "fiscal.webhook.spedy.received",
    createServiceLogMetadata(context, {
      companyId: webhook.companyId,
      documentKind: webhook.documentKind,
      providerDocumentId: webhook.providerDocumentId,
      providerEventId: webhook.providerEventId,
    }),
  );
  const recorded = await ports.fiscalWebhookRepository.recordReceived({
    environment: context.source?.environment ?? "unknown",
    eventType: webhook.eventType,
    payload: {
      companyId: webhook.companyId,
      documentKind: webhook.documentKind,
      providerDocumentId: webhook.providerDocumentId,
    },
    providerEventId: webhook.providerEventId,
  });
  if (!recorded.created && recorded.event.status !== "failed") {
    return { status: "duplicate" as const };
  }

  try {
    const connection = await ports.fiscalConnectionRepository.findByCompanyId(
      webhook.companyId,
    );
    if (!connection) {
      await ports.fiscalWebhookRepository.updateStatus({
        eventId: recorded.event.id,
        status: "ignored",
      });
      context.logger.info(
        "fiscal.webhook.spedy.ignored",
        createServiceLogMetadata(context, {
          companyId: webhook.companyId,
          providerEventId: webhook.providerEventId,
        }),
      );
      return { status: "ignored" as const };
    }
    const providerResult = await ports.fiscalProviderGateway.syncDocumentStatus(
      {
        documentKind: webhook.documentKind,
        providerDocumentId: webhook.providerDocumentId,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      },
    );
    const document = await ports.fiscalRepository.upsertProviderDocument({
      accessKey: providerResult.accessKey,
      documentKind: webhook.documentKind,
      documentType: `spedy_${webhook.documentKind}_synced`,
      metadata: {
        providerStatus: providerResult.status,
        source: "spedy_webhook",
      },
      providerDocumentId: webhook.providerDocumentId,
      status: mapProviderStatus(providerResult.status),
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    await ports.fiscalWebhookRepository.updateStatus({
      eventId: recorded.event.id,
      status: "processed",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    await context.audit.record({
      action: "fiscal.webhook.spedy.processed",
      actor: context.actor,
      category: "integration",
      criticality: "critical",
      entityId: document.id,
      entityType: "fiscal_document",
      metadata: {
        providerDocumentId: webhook.providerDocumentId,
        providerEventId: webhook.providerEventId,
        status: document.status,
      },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      summary: "Reconciled a Spedy fiscal webhook from provider evidence",
    });
    context.logger.info(
      "fiscal.webhook.spedy.processed",
      createServiceLogMetadata(context, {
        documentId: document.id,
        providerDocumentId: webhook.providerDocumentId,
        providerEventId: webhook.providerEventId,
        status: document.status,
      }),
    );
    return { documentId: document.id, status: "processed" as const };
  } catch (error) {
    await ports.fiscalWebhookRepository.updateStatus({
      errorMessage: error instanceof Error ? error.name : "UnknownError",
      eventId: recorded.event.id,
      status: "failed",
    });
    throw error;
  }
}

export class SpedyWebhookTokenError extends Error {
  constructor() {
    super("Spedy webhook token is invalid.");
    this.name = "SpedyWebhookTokenError";
  }
}
