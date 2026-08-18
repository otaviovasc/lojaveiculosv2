import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { integrationAccounts, crmChannelConnections } from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0042_provider_connection_identity_boundaries.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("provider connection identity boundaries", () => {
  it("models archived marketplace authorizations and scoped active identities", () => {
    const config = getTableConfig(integrationAccounts);
    expect(config.columns.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["archived_at", "provider_account_id"]),
    );
    expect(config.foreignKeys.map((key) => key.getName())).toContain(
      "integration_accounts_store_tenant_fk",
    );
    expect(config.indexes.map(({ config: index }) => index.name)).toEqual(
      expect.arrayContaining([
        "integration_accounts_store_provider_active_unique",
        "integration_accounts_scope_provider_identity_active_unique",
      ]),
    );
  });

  it("keeps canonical transport identities scoped and unique", () => {
    expect(
      getTableConfig(crmChannelConnections).indexes.map(
        ({ config }) => config.name,
      ),
    ).toEqual(
      expect.arrayContaining([
        "crm_channel_connections_scope_id_unique",
        "crm_channel_connections_external_unique",
      ]),
    );
  });

  it("installs fail-closed identity mutation triggers", () => {
    expect(migration).toContain(
      'create trigger "crm_connections_provider_identity_immutable"',
    );
    expect(migration).toContain(
      'create trigger "integration_accounts_provider_identity_immutable"',
    );
    expect(migration).toContain("archive and replace the connection");
    expect(migration).toContain("archive and replace the authorization");
  });
});
