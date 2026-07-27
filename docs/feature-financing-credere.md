# Credere Financing

## Product Contract

Target segment: agency-managed and owner-operated dealerships that already sell
financed vehicles and need a controlled path from CRM or inventory context to
Credere simulations.

Customer outcome: a store user can run a financing simulation for a real lead
and vehicle without copying personal data into a separate system, while agency
operators can connect Credere once and map only the stores they manage.

Leading metric: weekly stores with at least one successful simulation or
refreshed inquiry, segmented by agency-managed versus owner-managed billing.

Billing and entitlement: store simulation routes require the `simulations`
entitlement. Agency and direct-owner connection routes require the
`financing.connection.manage` permission; direct owners receive it only while
the authenticated store is billed by the owner, never while an agency manages
that store. Store simulation services must enforce the read/write financing
permissions before calling Credere.

Support owner: operations/support owns OAuth setup, store mapping, bank-policy
verification, and provider incident triage. Engineering owns runtime failures,
schema validation, and PII-safe error behavior.

Degraded state: when Credere credentials, OAuth state, store mapping, usable
banks, or the provider API are unavailable, the API returns a stable JSON API
error. It must not report a successful simulation unless Credere accepted or
returned the inquiry result.

## Safety Boundaries

- OAuth callback accepts only `code` and opaque `state`; tenant and store
  authority comes from the server-side state consumer.
- Store routes never accept tenant, store, external store, or `Store-Id` body
  fields. Store scope comes from authenticated V2 context.
- `POST /api/v1/financing/credere/simulations` requires `Idempotency-Key`.
- Public store status exposes only `configured`, `mappedStoreAlias`, and
  `usableBanks`.
- Provider errors must be mapped to stable codes without raw provider payloads,
  tokens, CPF/CNPJ, email, or phone values.

## Agency and Direct Ownership

The Credere OAuth connection belongs to the V2 tenant. For an agency-managed
tenant, only the agency administration context may connect the account,
discover its Credere sub-stores, or change mappings. For an owner-operated
tenant that is not tied to an agency, only an authenticated owner of that
direct-billed store may manage its connection.

An agency operator must explicitly map each local affiliated store to exactly
one active Credere sub-store. The API verifies that the local store belongs to
the agency tenant and that the selected Credere sub-store is returned by the
connected account. Database constraints prevent the same Credere sub-store
from being assigned to multiple local stores under the account.

Direct owners can discover the sub-stores returned by their own Credere OAuth
account, but the direct mapping endpoint always derives the current local store
from the authenticated session. It never accepts a local tenant or store ID
from the browser. The direct-owner connection response includes only the
current local store mapping.

Agency-managed client owners, non-owner store users, and CRM bot integrations:

- cannot list Credere sub-stores or create/change mappings;
- cannot submit `tenantId`, `storeId`, `externalStoreId`, `Store-Id`, seller
  CPF, OAuth values, or provider model identifiers;
- receive only the mapped alias, readiness blockers, and banks usable by their
  own store;
- have `Store-Id` resolved and injected by the server after tenant/store scope,
  permission, entitlement, and mapping checks.

## Provider Behavior

- OAuth uses the authorization-code flow with a random, hashed, expiring,
  single-use server-side state. PKCE is sent when the provider advertises
  support.
- Access and refresh tokens are encrypted at rest. Production-like
  environments fail closed when the encryption key or OAuth configuration is
  missing.
- Token refresh replaces the previous token set because Credere invalidates
  the old tokens on successful refresh.
- Provider hosts are fixed in the adapter. Request payloads cannot choose an
  outbound host or callback.
- Integrated banks are fetched for the mapped Credere store. Only credentials
  with `active = true` and `status = "okay"` are usable. An optional deployed
  FEBRABAN allowlist may narrow that set; it never broadens it.
- Simulation creation is persisted behind a store-scoped idempotency key and
  payload fingerprint. The provider write is not blindly retried after an
  ambiguous timeout or 5xx response.

## HTTP and CRM Surfaces

Agency routes live under
`/api/v1/agency/tenants/:tenantId/financing/credere` and cover connection
status, OAuth start, provider-store discovery, local-store mapping, unmapping,
and disconnect.

Store routes live under `/api/v1/financing/credere` and cover readiness,
required lead fields, simulation creation, history, detail, and provider
refresh. They require the `simulations` entitlement plus
`financing.simulation.create` or `financing.simulation.read`.

The same store prefix exposes direct-owner-only connection, OAuth,
provider-store discovery, current-store mapping, and disconnect endpoints.
Those controls require `membershipRole = owner` and
`billingManagedBy = store_owner`; an agency-managed owner receives a denial
before provider-store discovery.

The WhatsApp CRM bot exposes `credere_readiness`,
`credere_create_simulation`, and `credere_get_simulation`. The integration
context supplies the trusted tenant/store, real store entitlements, and the
minimum financing permission for the selected action. The bot contract uses
the same public simulation input as HTTP and recursively rejects provider and
scope override fields.

## V1 to V2 Cutover

1. Apply the V2 financing-provider migration.
2. Configure the Credere OAuth client, exact callback URI, and credential
   encryption key.
3. Have each agency reconnect its Credere account through the V2 agency page.
   Have each owner-operated tenant reconnect through the V2 simulations page.
   Do not bulk-copy V1 plaintext/encrypted tokens unless encryption
   compatibility and token ownership have been proven.
4. Map each V2 affiliated store to its Credere sub-store. Stop and resolve any
   duplicate or ambiguous external store IDs instead of auto-selecting the
   first provider store.
5. Verify readiness and the active/`okay` bank set with synthetic data.
6. Enable the `simulations` entitlement and store role permissions only after
   the mapping is reviewed.
7. Run a real production simulation only with explicit customer consent and
   authorized personal data. Keep that operational smoke outside automated
   tests and logs.

Rollback is fail-closed: remove the store mapping or disconnect the agency
connection. Existing local inquiries remain readable, but no new provider call
can be made without an active connection and mapping.
