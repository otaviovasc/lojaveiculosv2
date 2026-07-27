import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { FinancingProvider } from "../../ports/financingRepository.js";
import type { CredereRequiredFieldsResult } from "./types.js";
import {
  financingSimulationReadPermission,
  FinancingProviderMappingRequiredError,
  FinancingValidationError,
  getFinancingGateway,
  normalizeDocument,
  requireFinancingScope,
  type FinancingServicePorts,
} from "./serviceSupport.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";

const provider = "credere" satisfies FinancingProvider;

export async function getCredereRequiredFields(
  context: ServiceContext,
  input: { document: string },
  ports: FinancingServicePorts,
): Promise<CredereRequiredFieldsResult> {
  assertPermission(context, financingSimulationReadPermission);
  const scope = requireFinancingScope(context);
  context.logger.info(
    "financing.required_fields.read.started",
    createServiceLogMetadata(context, {
      permission: financingSimulationReadPermission,
      provider,
    }),
  );
  const connection = await getUsableProviderConnection(
    {
      provider,
      tenantId: scope.tenantId,
    },
    ports,
  );
  const mapping = await ports.repository.findStoreMapping({
    provider,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!mapping) throw new FinancingProviderMappingRequiredError();

  const cpfCnpj = normalizeDocument(input.document);
  if (cpfCnpj.length < 11) {
    throw new FinancingValidationError("Customer document is invalid.");
  }

  const result = await getFinancingGateway(ports).getRequiredFields({
    cpfCnpj,
    credereStoreId: mapping.providerStoreId,
    token: connection.token!,
  });
  const requirements = sanitizeRequirements(result.requirements);
  const response = {
    knownLead: Boolean(result.lead),
    missingFields: uniqueRequirementFields(requirements),
    requirements,
  };
  await context.audit.record({
    action: "financing.required_fields.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "financing_required_fields",
    metadata: {
      knownLead: response.knownLead,
      missingFieldCount: response.missingFields.length,
      permission: financingSimulationReadPermission,
      provider,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Read Credere required fields",
    tenantId: scope.tenantId,
  });
  return response;
}

function sanitizeRequirements(
  requirements: Record<string, string[]>,
): Record<string, readonly string[]> {
  return Object.fromEntries(
    Object.entries(requirements).map(([section, fields]) => [
      section,
      fields.filter((field) => typeof field === "string" && field.trim()),
    ]),
  );
}

function uniqueRequirementFields(
  requirements: Record<string, readonly string[]>,
): string[] {
  return [...new Set(Object.values(requirements).flat())].sort();
}
