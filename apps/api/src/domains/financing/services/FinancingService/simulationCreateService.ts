import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  FinancingInquiry,
  FinancingProvider,
} from "../../ports/financingRepository.js";
import { FinancingProviderGatewayError } from "../../ports/financingProviderGateway.js";
import { resolveCredereSellerCpf } from "../../support/providerResolutionHelpers.js";
import {
  completeFromProvider,
  resolveUsableBankCodes,
  toFingerprint,
  toSanitizedMetadata,
  upsertCredereLead,
} from "../../support/simulationProviderHelpers.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";
import type { CreateCredereSimulationInput } from "./types.js";
import { resolveSubmittedCredereVehicle } from "./fipeResolutionService.js";
import {
  assertValidInquiryReferences,
  createValidatedInquiry,
} from "./inquiryReferenceValidation.js";
import {
  documentLast4,
  financingSimulationCreatePermission,
  FinancingConsentRequiredError,
  FinancingIdempotencyConflictError,
  FinancingOperationInProgressError,
  FinancingProviderMappingRequiredError,
  FinancingValidationError,
  getFinancingGateway,
  normalizeDocument,
  now,
  requireFinancingScope,
  sha256Hex,
  type FinancingServicePorts,
} from "./serviceSupport.js";

const provider = "credere" satisfies FinancingProvider;
export async function createCredereSimulation(
  context: ServiceContext,
  input: CreateCredereSimulationInput,
  ports: FinancingServicePorts,
): Promise<FinancingInquiry> {
  assertPermission(context, financingSimulationCreatePermission);
  const scope = requireFinancingScope(context);
  context.logger.info(
    "financing.simulation.create.started",
    createServiceLogMetadata(context, {
      permission: financingSimulationCreatePermission,
      provider,
    }),
  );
  if (!input.consent.accepted) throw new FinancingConsentRequiredError();
  const idempotencyKey =
    input.idempotencyKey ?? context.request?.idempotencyKey;
  if (!idempotencyKey) {
    throw new FinancingValidationError("Idempotency key is required.");
  }
  await assertValidInquiryReferences(input, scope, ports.repository);
  const connection = await getUsableProviderConnection(
    { provider, tenantId: scope.tenantId },
    ports,
  );
  const mapping = await ports.repository.findStoreMapping({
    provider,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!mapping) throw new FinancingProviderMappingRequiredError();

  const bankCodes = await resolveUsableBankCodes(
    input,
    scope,
    mapping.providerStoreId,
    connection.token!,
    ports,
  );
  const [sellerCpf, vehicle] = await Promise.all([
    resolveCredereSellerCpf(mapping.providerStoreId, connection.token!, ports),
    resolveSubmittedCredereVehicle(
      mapping.providerStoreId,
      connection.token!,
      input,
      ports,
    ),
  ]);
  const fingerprint = sha256Hex(
    JSON.stringify(toFingerprint(input, bankCodes)),
  );
  const reserved = await ports.repository.reserveSimulationOperation({
    idempotencyKey,
    requestFingerprint: fingerprint,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (reserved.kind === "conflict")
    throw new FinancingIdempotencyConflictError();
  if (reserved.kind === "duplicate" && reserved.inquiryId) {
    const existing = await ports.repository.findInquiryById({
      inquiryId: reserved.inquiryId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    if (existing) return existing;
  }
  if (reserved.kind === "duplicate") {
    throw new FinancingOperationInProgressError();
  }

  const inquiry = await createValidatedInquiry(ports.repository, {
    amountCents: input.amountCents,
    bankCodes,
    consentEvidence: {
      acceptedAt: input.consent.acceptedAt ?? now(ports),
      ipAddress: input.consent.ipAddress ?? context.request?.ipAddress ?? null,
      termsVersion: input.consent.termsVersion,
      userAgent: input.consent.userAgent ?? context.request?.userAgent ?? null,
    },
    customerDocumentHash: sha256Hex(normalizeDocument(input.customer.document)),
    customerDocumentLast4: documentLast4(input.customer.document),
    downPaymentCents: input.downPaymentCents,
    idempotencyKey,
    installments: input.installments,
    leadId: input.leadId ?? null,
    listingId: input.listingId ?? null,
    metadata: toSanitizedMetadata(input),
    operationId: reserved.operationId,
    provider,
    providerStoreId: mapping.providerStoreId,
    requestedByUserId:
      context.actor.kind === "user" ? String(context.actor.id) : null,
    storeId: scope.storeId,
    storeMappingId: mapping.id,
    tenantId: scope.tenantId,
    unitId: input.unitId ?? null,
  });
  await context.audit.record({
    action: "financing.simulation.create.requested",
    actor: context.actor,
    category: "data_change",
    entityId: inquiry.id,
    entityType: "financing_inquiry",
    metadata: {
      bankCodeCount: bankCodes.length,
      permission: financingSimulationCreatePermission,
      provider,
    },
    outcome: "attempted",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Requested Credere financing simulation",
    tenantId: scope.tenantId,
  });

  try {
    const lead = await upsertCredereLead(
      mapping.providerStoreId,
      connection.token!,
      input,
      ports,
    );
    const simulation = await getFinancingGateway(ports).createSimulation({
      credereStoreId: mapping.providerStoreId,
      simulation: {
        assetValueCents: input.vehicle.assetValueCents,
        bankFebrabanCodes: [...bankCodes],
        conditions: [
          {
            downPaymentCents: input.downPaymentCents,
            financedAmountCents: input.amountCents,
            installments: input.installments,
            ...(bankCodes[0] ? { bankFebrabanCode: bankCodes[0] } : {}),
          },
        ],
        retrieveLeadCpfCnpj: lead.cpfCnpj,
        sellerCpf,
        vehicle,
      },
      token: connection.token!,
    });
    const completed = await completeFromProvider(inquiry, simulation, ports);
    await context.audit.record({
      action: "financing.simulation.create",
      actor: context.actor,
      category: "data_change",
      entityId: completed.id,
      entityType: "financing_inquiry",
      metadata: {
        bankCodeCount: bankCodes.length,
        permission: financingSimulationCreatePermission,
        provider,
        status: completed.status,
      },
      outcome: completed.status === "failed" ? "failed" : "succeeded",
      requestId: context.requestId,
      storeId: scope.storeId,
      summary:
        completed.status === "failed"
          ? "Credere financing simulation failed"
          : "Created Credere financing simulation",
      tenantId: scope.tenantId,
    });
    return completed;
  } catch (error) {
    if (isIndeterminateProviderWrite(error)) {
      return ports.repository.markInquiryIndeterminate({
        inquiryId: inquiry.id,
        providerInquiryId: null,
        reason: providerFailureReason(error),
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
    }
    if (error instanceof FinancingProviderGatewayError) {
      await ports.repository.failInquiry({
        errorCode: error.kind,
        errorMessage: error.message,
        inquiryId: inquiry.id,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
    }
    throw error;
  }
}

function isIndeterminateProviderWrite(error: unknown): boolean {
  return (
    error instanceof FinancingProviderGatewayError &&
    (error.kind === "indeterminate" || error.kind === "unavailable")
  );
}

function providerFailureReason(error: unknown): string {
  return error instanceof FinancingProviderGatewayError
    ? `provider_${error.kind}`
    : "provider_result_indeterminate";
}
