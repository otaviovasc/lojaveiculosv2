export * from "./schema/auditActors.js";
export * from "./schema/auditEntities.js";
export * from "./schema/auditEvents.js";
export * from "./schema/auditRequests.js";
export * from "./schema/auditSinkFailures.js";

export const auditDatabasePolicy = {
  database: "separate_railway_postgres",
  retention: "domain_specific_retention_to_be_defined",
  tableCase: "lower_snake_case",
  writePath: "audit_sink_only",
} as const;
