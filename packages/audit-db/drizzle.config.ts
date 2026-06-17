import { defineConfig } from "drizzle-kit";

const localAuditDatabaseUrl =
  "postgresql://lojaveiculosv2_audit:lojaveiculosv2_audit_dev@localhost:54322/lojaveiculosv2_audit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.AUDIT_DATABASE_URL ?? localAuditDatabaseUrl,
  },
  out: "./drizzle",
  schema: "./src/schema/*.ts",
  strict: true,
});
