export function supplierResult() {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    displayName: "Auto Avaliar",
    documentNumber: "12345678000199",
    email: "contato@autoavaliar.test",
    externalProviderId: "provider-1",
    id: "supplier_1",
    kind: "provider" as const,
    metadata: {},
    phone: "11999999999",
    provider: "auto_avaliar",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export function acquisitionResult() {
  return {
    acquisitionDate: new Date("2026-01-02T00:00:00.000Z"),
    acquisitionPriceCents: 9000000,
    acquisitionUserId: null,
    channel: "auto_avaliar" as const,
    commissionTiming: "closed" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    customChannelLabel: null,
    id: "acquisition_1",
    leadId: null,
    metadata: {},
    notes: "Compra originada no Auto Avaliar",
    sourceSnapshot: {},
    storeId: "store_1",
    supplierId: "supplier_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
