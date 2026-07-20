export function requireFinanceScope(input: {
  storeId: string | null;
  tenantId: string | null;
}): { storeId: string; tenantId: string } {
  if (!input.storeId) throw new FinanceDrizzleScopeError("storeId");
  if (!input.tenantId) throw new FinanceDrizzleScopeError("tenantId");
  return { storeId: input.storeId, tenantId: input.tenantId };
}

export class FinanceDrizzleScopeError extends Error {
  constructor(fieldName: string) {
    super(`Finance drizzle repository requires ${fieldName}.`);
    this.name = "FinanceDrizzleScopeError";
  }
}
