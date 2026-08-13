export function presentAgencyConnection(value: unknown) {
  const record = asRecord(value);
  const configured = isConfiguredConnection(record);
  return {
    configured,
    connected: Boolean(record.connected),
    connection: presentConnection(
      record.connection ?? (configured ? record : null),
    ),
    storeMappings: asArray(record.storeMappings).map(presentStoreMapping),
  };
}

export function presentDirectOwnerConnection(value: unknown, storeId: string) {
  const record = asRecord(value);
  const configured = isConfiguredConnection(record);
  return {
    configured,
    connected: Boolean(record.connected),
    connection: presentConnection(
      record.connection ?? (configured ? record : null),
    ),
    storeMapping:
      asArray(record.storeMappings)
        .map(presentStoreMapping)
        .find((mapping) => mapping.storeId === storeId) ?? null,
  };
}

export function presentStoreStatus(value: unknown) {
  const record = asRecord(value);
  return {
    configured: Boolean(record.configured),
    mappedStoreAlias:
      typeof record.mappedStoreAlias === "string"
        ? record.mappedStoreAlias
        : null,
    usableBanks: asArray(record.usableBanks).map(presentUsableBank),
  };
}

export function presentSimulation(value: unknown) {
  const record = asRecord(value);
  return {
    inquiryId: String(record.inquiryId ?? record.id ?? ""),
    ...(typeof record.leadId === "string" ? { leadId: record.leadId } : {}),
    ...(typeof record.listingId === "string"
      ? { listingId: record.listingId }
      : {}),
    ...(typeof record.unitId === "string" ? { unitId: record.unitId } : {}),
    ...(typeof record.status === "string" ? { status: record.status } : {}),
    ...(presentDate(record.createdAt)
      ? { createdAt: presentDate(record.createdAt) }
      : {}),
    ...(presentDate(record.updatedAt)
      ? { updatedAt: presentDate(record.updatedAt) }
      : {}),
    ...(presentDate(record.completedAt)
      ? { completedAt: presentDate(record.completedAt) }
      : {}),
    ...(typeof record.providerRequestId === "string"
      ? { providerRequestId: record.providerRequestId }
      : {}),
    ...(typeof record.reason === "string" ? { reason: record.reason } : {}),
    ...(typeof record.success === "boolean" ? { success: record.success } : {}),
    conditions: asArray(record.conditions).map(presentSimulationCondition),
  };
}

export function presentSimulationList(value: unknown) {
  const record = asRecord(value);
  const simulations = Array.isArray(value)
    ? value
    : asArray(record.simulations ?? record.inquiries);
  return { simulations: simulations.map(presentSimulation) };
}

export function presentProviderStores(value: unknown) {
  const record = asRecord(value);
  return {
    stores: asArray(record.stores).map((store) => {
      const item = asRecord(store);
      return {
        externalStoreId: String(item.externalStoreId ?? item.id ?? ""),
        ...(typeof item.alias === "string" ? { alias: item.alias } : {}),
        ...(typeof item.document === "string"
          ? { document: item.document }
          : {}),
        ...(typeof item.name === "string" ? { name: item.name } : {}),
        ...(typeof item.status === "string" ? { status: item.status } : {}),
      };
    }),
  };
}

export function presentStoreMapping(value: unknown) {
  const record = asRecord(value);
  return {
    storeId: String(record.storeId ?? ""),
    externalStoreId: String(record.externalStoreId ?? ""),
    ...(typeof record.externalStoreAlias === "string"
      ? { externalStoreAlias: record.externalStoreAlias }
      : {}),
  };
}

function presentConnection(value: unknown) {
  if (!value) return null;
  const record = asRecord(value);
  return {
    connected: Boolean(record.connected),
    ...(presentDate(record.connectedAt)
      ? { connectedAt: presentDate(record.connectedAt) }
      : {}),
    ...(presentDate(record.expiresAt)
      ? { expiresAt: presentDate(record.expiresAt) }
      : {}),
    ...(typeof record.status === "string" ? { status: record.status } : {}),
  };
}

function isConfiguredConnection(record: Record<string, unknown>) {
  if (typeof record.configured === "boolean") return record.configured;
  return typeof record.status === "string" && record.status !== "not_connected";
}

function presentDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : null;
}

function presentUsableBank(value: unknown) {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return {
    code: String(record.code ?? ""),
    ...(typeof record.name === "string" ? { name: record.name } : {}),
  };
}

function presentSimulationCondition(value: unknown) {
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  return {
    ...(typeof record.id === "string" ? { id: record.id } : {}),
    ...(typeof record.status === "string" ? { status: record.status } : {}),
    ...(typeof record.bankCode === "string"
      ? { bankCode: record.bankCode }
      : {}),
    ...(typeof record.bankName === "string"
      ? { bankName: record.bankName }
      : {}),
    ...(typeof record.installments === "number"
      ? { installments: record.installments }
      : {}),
    ...(typeof record.summary === "string" ? { summary: record.summary } : {}),
    ...(typeof record.totalAmountCents === "number"
      ? { totalAmountCents: record.totalAmountCents }
      : {}),
    ...(typeof metadata.downPaymentCents === "number"
      ? { downPaymentCents: metadata.downPaymentCents }
      : {}),
    ...(typeof metadata.firstInstallmentCents === "number"
      ? { firstInstallmentCents: metadata.firstInstallmentCents }
      : {}),
    ...(typeof metadata.preApprovalStatus === "number"
      ? { preApprovalStatus: metadata.preApprovalStatus }
      : {}),
    ...(typeof metadata.reasonIdentifier === "string"
      ? { reasonIdentifier: metadata.reasonIdentifier }
      : {}),
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
