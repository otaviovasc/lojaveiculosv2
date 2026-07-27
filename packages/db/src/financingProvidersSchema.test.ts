import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  financingConditions,
  financingCustomerConsents,
  financingInquiries,
  financingOperationRequests,
  financingProviderAccounts,
  financingProviderStoreBanks,
  financingProviderStoreMappings,
  financingProviderTokens,
  providerOauthTransactions,
  stores,
} from "./index.js";

describe("financing provider schema", () => {
  it("keeps provider accounts unique per tenant, provider, and environment", () => {
    const indexes = getTableConfig(financingProviderAccounts).indexes;

    expect(
      indexes.find(({ config }) => config.name === accountUnique)?.config,
    ).toMatchObject({
      columns: [
        expect.objectContaining({ name: "tenant_id" }),
        expect.objectContaining({ name: "provider" }),
        expect.objectContaining({ name: "environment" }),
      ],
      unique: true,
    });
  });

  it("uses composite scope keys for provider store mappings and local stores", () => {
    const mappingConfig = getTableConfig(financingProviderStoreMappings);
    const storeIndexes = getTableConfig(stores).indexes;

    expect(
      storeIndexes.find(
        ({ config }) => config.name === "stores_id_tenant_unique",
      )?.config.unique,
    ).toBe(true);
    expect(
      mappingConfig.indexes
        .find(({ config }) => config.name === mappingScope)
        ?.config.columns.map((column) => ("name" in column ? column.name : "")),
    ).toEqual(["id", "account_id", "tenant_id", "store_id"]);
    expect(
      mappingConfig.foreignKeys.map((foreignKey) => foreignKey.getName()),
    ).toEqual(
      expect.arrayContaining([
        "financing_provider_store_mappings_account_scope_fk",
        "financing_provider_store_mappings_store_scope_fk",
      ]),
    );
  });

  it("keeps OAuth state single-use with opaque hashes and nullable PKCE", () => {
    const config = getTableConfig(providerOauthTransactions);
    const dialect = new PgDialect();
    const checks = config.checks.map((item) =>
      dialect.sqlToQuery(item.value).sql.toLowerCase(),
    );

    expect(
      config.indexes.find(
        ({ config: indexConfig }) =>
          indexConfig.name === "provider_oauth_transactions_state_hash_unique",
      )?.config.unique,
    ).toBe(true);
    expect(checks.join("\n")).toContain("code_verifier_ciphertext");
    expect(checks.join("\n")).toContain("consumed_at");
    expect(checks.join("\n")).toContain("expires_at");
  });

  it("stores only sanitized financing customer and provider result fields", () => {
    const tables = [
      financingConditions,
      financingCustomerConsents,
      financingInquiries,
      financingOperationRequests,
      financingProviderStoreBanks,
      financingProviderTokens,
    ];

    for (const table of tables) {
      const columns = getTableConfig(table).columns.map(
        (column) => column.name,
      );

      expect(columns).not.toContain("document_number");
      expect(columns).not.toContain("request_payload");
      expect(columns).not.toContain("response_payload");
      expect(columns).not.toContain("raw_payload");
    }
  });

  it("scopes financing idempotency by tenant, store, and provider", () => {
    expect(
      indexColumnNames(financingOperationRequests, operationIdempotency),
    ).toEqual(["tenant_id", "store_id", "provider", "idempotency_key"]);
    expect(indexColumnNames(financingInquiries, inquiryIdempotency)).toEqual([
      "tenant_id",
      "store_id",
      "provider",
      "idempotency_key",
    ]);
  });
});

const accountUnique = "financing_provider_accounts_tenant_provider_env_unique";
const inquiryIdempotency = "financing_inquiries_idempotency_unique";
const mappingScope = "financing_provider_store_mappings_id_scope_unique";
const operationIdempotency = "financing_operation_requests_idempotency_unique";

function indexColumnNames(
  table: typeof financingInquiries | typeof financingOperationRequests,
  indexName: string,
): string[] | undefined {
  return getTableConfig(table)
    .indexes.find(({ config }) => config.name === indexName)
    ?.config.columns.map((column) =>
      "name" in column ? (column.name ?? "") : "",
    );
}
