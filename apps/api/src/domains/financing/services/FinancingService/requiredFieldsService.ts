import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { FinancingProvider } from "../../ports/financingRepository.js";
import type { CredereRequiredFieldsResult } from "./types.js";
import { resolveUsableBanks } from "../../support/simulationProviderHelpers.js";
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
  input: { bankCodes?: readonly string[]; document: string },
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

  const [result, usableBanks] = await Promise.all([
    getFinancingGateway(ports).getRequiredFields({
      cpfCnpj,
      credereStoreId: mapping.providerStoreId,
      token: connection.token!,
    }),
    resolveUsableBanks(
      input.bankCodes,
      scope,
      mapping.providerStoreId,
      connection.token!,
      ports,
    ),
  ]);
  const requirements = filterRequirementsByUsableBanks(
    sanitizeRequirements(result.requirements),
    usableBanks,
  );
  const domainTypes = requiredDomainTypes(requirements);
  const domains = domainTypes.length
    ? await getFinancingGateway(ports).listDomainOptions({
        credereStoreId: mapping.providerStoreId,
        token: connection.token!,
        types: domainTypes,
      })
    : {};
  const response = {
    applicant: result.lead
      ? {
          addressZipCode: result.lead.addressZipCode,
          birthDate: result.lead.birthdate,
          email: result.lead.email,
          genderCode: result.lead.genderCode,
          hasCnh: result.lead.hasCnh,
          monthlyIncomeCents: result.lead.monthlyIncomeCents,
          name: result.lead.name,
          occupationCode: result.lead.occupationCode,
          phone: result.lead.phoneNumber,
        }
      : null,
    domains,
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

function requiredDomainTypes(requirements: Record<string, readonly string[]>) {
  const normalizedFields = Object.keys(requirements).map((field) =>
    field
      .trim()
      .toLowerCase()
      .replace(/[.\s-]+/g, "_"),
  );
  return [
    ...(normalizedFields.some((field) =>
      ["gender", "retrieve_gender"].includes(field.replace(/^lead_/, "")),
    )
      ? ["gender"]
      : []),
    ...(normalizedFields.some((field) =>
      ["occupation", "retrieve_occupation"].includes(
        field.replace(/^lead_/, ""),
      ),
    )
      ? ["occupation"]
      : []),
  ];
}

function filterRequirementsByUsableBanks(
  requirements: Record<string, readonly string[]>,
  banks: readonly {
    code: string;
    name: string | null;
    tradename: string | null;
  }[],
): Record<string, readonly string[]> {
  const byIdentifier = new Map<string, string>();
  for (const bank of banks) {
    const label = bank.tradename ?? bank.name ?? bank.code;
    for (const identifier of [bank.code, bank.name, bank.tradename]) {
      const normalized = normalizeBankIdentifier(identifier);
      if (normalized) byIdentifier.set(normalized, label);
    }
  }
  const applicable: Record<string, readonly string[]> = {};
  for (const [field, identifiers] of Object.entries(requirements)) {
    if (identifiers.length === 0) {
      applicable[field] = [];
      continue;
    }
    const matches = identifiers
      .map((identifier) =>
        byIdentifier.get(normalizeBankIdentifier(identifier)),
      )
      .filter((value): value is string => Boolean(value));
    if (matches.length) applicable[field] = [...new Set(matches)];
  }
  return applicable;
}

function normalizeBankIdentifier(value: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  return digits
    ? digits.padStart(3, "0")
    : value.trim().toLocaleLowerCase("pt-BR");
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
  return [...new Set(Object.keys(requirements))].sort();
}
