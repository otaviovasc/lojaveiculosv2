export * from "./schema/identity.js";
export * from "./schema/storeProfile.js";
export * from "./schema/inventory.js";
export * from "./schema/inventoryOperations.js";
export * from "./schema/documents.js";
export * from "./schema/leads.js";
export * from "./schema/crm.js";
export * from "./schema/sales.js";
export * from "./schema/finance.js";
export * from "./schema/billing.js";
export * from "./schema/bankingReserve.js";
export * from "./schema/providerEvents.js";
export * from "./schema/integrations.js";
export * from "./schema/fiscal.js";
export * from "./schema/externalApi.js";
export * from "./schema/migration.js";

export const databaseNamingPolicy = {
  columnCase: "lower_snake_case",
  idPolicy: "uuid_primary_key_default_random",
  language: "english",
  tableCase: "lower_snake_case",
  timestampPolicy: "created_at_updated_at_with_timezone",
} as const;
