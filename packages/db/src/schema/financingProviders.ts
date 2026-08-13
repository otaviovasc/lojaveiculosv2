import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { tenants, users } from "./identity.js";

const includeFinancingScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const financingProvider = pgEnum("financing_provider", ["credere"]);

export const financingProviderEnvironment = pgEnum(
  "financing_provider_environment",
  ["sandbox", "production"],
);

export const financingProviderAccountStatus = pgEnum(
  "financing_provider_account_status",
  ["pending", "active", "paused", "disconnected", "error", "archived"],
);

export const financingProviderTokenKind = pgEnum(
  "financing_provider_token_kind",
  ["access_token", "refresh_token", "id_token"],
);

export const providerOauthTransactionStatus = pgEnum(
  "provider_oauth_transaction_status",
  ["pending", "consumed", "expired", "cancelled", "failed"],
);

export const financingProviderAccounts = pgTable(
  "financing_provider_accounts",
  {
    ...lifecycleColumns,
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    environment: financingProviderEnvironment("environment").notNull(),
    externalAccountId: varchar("external_account_id", { length: 191 }),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    provider: financingProvider("provider").notNull(),
    status: financingProviderAccountStatus("status")
      .notNull()
      .default("pending"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    uniqueIndex("financing_provider_accounts_id_tenant_unique").on(
      table.id,
      table.tenantId,
    ),
    uniqueIndex("financing_provider_accounts_tenant_provider_env_unique").on(
      table.tenantId,
      table.provider,
      table.environment,
    ),
    index("financing_provider_accounts_tenant_status_idx").on(
      table.tenantId,
      table.status,
    ),
    check(
      "financing_provider_accounts_connection_dates_valid",
      sql`${table.disconnectedAt} IS NULL OR ${table.connectedAt} IS NULL OR ${table.disconnectedAt} >= ${table.connectedAt}`,
    ),
  ],
);

export const financingProviderTokens = pgTable(
  "financing_provider_tokens",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id").notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    encryptionKeyRef: varchar("encryption_key_ref", { length: 191 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    kind: financingProviderTokenKind("kind").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeFinancingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.accountId, table.tenantId],
            foreignColumns: [
              financingProviderAccounts.id,
              financingProviderAccounts.tenantId,
            ],
            name: "financing_provider_tokens_account_scope_fk",
          }).onDelete("cascade"),
        ]
      : []),
    index("financing_provider_tokens_account_kind_idx").on(
      table.accountId,
      table.kind,
    ),
    uniqueIndex("financing_provider_tokens_fingerprint_unique").on(
      table.fingerprint,
    ),
    check(
      "financing_provider_tokens_fingerprint_sha256",
      sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const providerOauthTransactions = pgTable(
  "provider_oauth_transactions",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id"),
    codeChallengeMethod: varchar("code_challenge_method", { length: 16 }),
    codeVerifierCiphertext: text("code_verifier_ciphertext"),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedByUserId: uuid("consumed_by_user_id").references(() => users.id),
    environment: financingProviderEnvironment("environment").notNull(),
    errorCode: varchar("error_code", { length: 120 }),
    errorMessage: text("error_message"),
    exchangeLeaseExpiresAt: timestamp("exchange_lease_expires_at", {
      withTimezone: true,
    }),
    exchangeLeaseOwner: varchar("exchange_lease_owner", { length: 191 }),
    exchangeTokenCiphertext: text("exchange_token_ciphertext"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    provider: financingProvider("provider").notNull(),
    redirectUriHash: varchar("redirect_uri_hash", { length: 64 }).notNull(),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    stateHash: varchar("state_hash", { length: 64 }).notNull(),
    status: providerOauthTransactionStatus("status")
      .notNull()
      .default("pending"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeFinancingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.accountId, table.tenantId],
            foreignColumns: [
              financingProviderAccounts.id,
              financingProviderAccounts.tenantId,
            ],
            name: "provider_oauth_transactions_account_scope_fk",
          }),
        ]
      : []),
    uniqueIndex("provider_oauth_transactions_state_hash_unique").on(
      table.stateHash,
    ),
    index("provider_oauth_transactions_tenant_status_idx").on(
      table.tenantId,
      table.status,
      table.expiresAt,
    ),
    check(
      "provider_oauth_transactions_state_hash_sha256",
      sql`${table.stateHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "provider_oauth_transactions_redirect_uri_hash_sha256",
      sql`${table.redirectUriHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "provider_oauth_transactions_pkce_consistent",
      sql`(
        (${table.codeVerifierCiphertext} IS NULL AND ${table.codeChallengeMethod} IS NULL)
        OR
        (${table.codeVerifierCiphertext} IS NOT NULL AND ${table.codeChallengeMethod} IS NOT NULL)
      )`,
    ),
    check(
      "provider_oauth_transactions_single_use_consistent",
      sql`(
        (${table.status} = 'consumed' AND ${table.consumedAt} IS NOT NULL)
        OR
        (${table.status} <> 'consumed' AND ${table.consumedAt} IS NULL AND ${table.consumedByUserId} IS NULL)
      )`,
    ),
    check(
      "provider_oauth_transactions_exchange_lease_consistent",
      sql`(
        (${table.status} = 'pending' AND ${table.exchangeLeaseOwner} IS NOT NULL AND ${table.exchangeLeaseExpiresAt} IS NOT NULL)
        OR
        (${table.exchangeLeaseOwner} IS NULL AND ${table.exchangeLeaseExpiresAt} IS NULL)
      )`,
    ),
    check(
      "provider_oauth_transactions_ttl_valid",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);
