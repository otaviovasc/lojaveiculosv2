import { json, targetId } from "./common.mjs";
import { log, migrationErrorSummary } from "./log.mjs";
import {
  encryptSpedyCredential,
  ensureSpedyWebhook,
  isTransientSpedyError,
  latestCertificateExpiration,
  listSpedyInvoices,
  requireSpedyEnvironment,
  sanitizeProviderObject,
  spedyRequest,
} from "./spedy-fiscal-client.mjs";
import {
  reconcileSpedyFiscalDocuments,
  requiredString,
} from "./spedy-fiscal-reconciliation.mjs";
import {
  degradedFiscalMigration,
  migratedTaxDefaults,
  providerErrorCode,
} from "./spedy-fiscal-preparation-support.mjs";

export {
  decryptSpedyCredential,
  encryptSpedyCredential,
} from "./spedy-fiscal-client.mjs";
export { reconcileSpedyFiscalDocuments } from "./spedy-fiscal-reconciliation.mjs";

const PROVIDER = "spedy";

export async function prepareSpedyFiscalMigration(data, config) {
  if (!data.fiscalAddon?.active) return null;
  const legacy = json(data.fiscalAddon.config);
  const companyId = requiredString(legacy.companyId, "Spedy company id");
  const companyApiKey = requiredString(legacy.apiKey, "Spedy company API key");
  const env = process.env;
  requireSpedyEnvironment(env, [
    "FISCAL_CREDENTIAL_ENCRYPTION_KEY",
    "SPEDY_API_URL",
    "SPEDY_OWNER_API_KEY",
    "SPEDY_WEBHOOK_URL",
  ]);

  log("  Fiscal: reading company settings and emissions from Spedy...");
  let company;
  let productInvoices;
  let serviceInvoices;
  let settings;
  let certificates;
  try {
    company = await spedyRequest(
      env,
      env.SPEDY_OWNER_API_KEY,
      `companies/${companyId}`,
    );
    [productInvoices, serviceInvoices, settings, certificates] =
      await Promise.all([
        listSpedyInvoices(env, companyApiKey, "product-invoices"),
        listSpedyInvoices(env, companyApiKey, "service-invoices"),
        spedyRequest(
          env,
          env.SPEDY_OWNER_API_KEY,
          `companies/${companyId}/settings`,
        ).catch(() => ({})),
        spedyRequest(
          env,
          env.SPEDY_OWNER_API_KEY,
          `companies/${companyId}/certificates`,
        ).catch(() => ({})),
      ]);
  } catch (error) {
    if (!isTransientSpedyError(error)) throw error;
    log(
      `  ⚠ Fiscal: Spedy unavailable after retries (${migrationErrorSummary(error)}).`,
    );
    log(
      "  ⚠ Fiscal: continuing with encrypted V1 credentials and unverified legacy fiscal data; V2 connection will require provider review.",
    );
    return degradedFiscalMigration(
      data,
      config,
      legacy,
      companyId,
      companyApiKey,
      env,
      error.code,
      migratedTaxDefaults(legacy, data.fiscalDocuments),
    );
  }
  let webhookRegistered = false;
  let lastErrorCode = null;
  if (config.apply) {
    try {
      webhookRegistered = await ensureSpedyWebhook(env);
    } catch (error) {
      lastErrorCode = providerErrorCode(error, "spedy_webhook_unavailable");
      log(
        `  ⚠ Fiscal: webhook registration deferred (${migrationErrorSummary(error)}); migration will continue with the connection pending review.`,
      );
    }
  }
  const companyAddress = json(json(company).address);
  const companyCity = json(companyAddress.city);
  const cityCode =
    companyCity.code ?? legacy.cityCode ?? json(legacy.nfseConfig).cityCode;
  const cityResult = cityCode
    ? await spedyRequest(
        env,
        companyApiKey,
        `service-invoices/cities?code=${encodeURIComponent(String(cityCode))}&pageSize=1`,
      ).catch(() => ({}))
    : {};
  const cityProvider = json(
    (Array.isArray(cityResult.items) ? cityResult.items : [])[0]?.provider,
  );
  const legacyProviderOptions = json(json(legacy.nfseConfig).providerOptions);

  return {
    capabilities: {
      city: {
        code: cityCode ?? null,
        provider: Object.keys(cityProvider).length
          ? sanitizeProviderObject(cityProvider)
          : { options: legacyProviderOptions },
      },
      migratedFromV1: true,
      nfse: {
        providerOptions: legacyProviderOptions,
      },
      providerSync: { status: "synced" },
      supportedDocuments: ["nfe", "nfse"],
    },
    certificateExpiresAt: latestCertificateExpiration(certificates, legacy),
    companyId,
    credentialCiphertext: encryptSpedyCredential(
      companyApiKey,
      env.FISCAL_CREDENTIAL_ENCRYPTION_KEY,
    ),
    fiscalDocuments: reconcileSpedyFiscalDocuments(
      data.fiscalDocuments,
      productInvoices,
      serviceInvoices,
      config,
    ),
    issuerProfile: sanitizeProviderObject(
      Object.keys(json(company)).length ? company : legacy.companyInfo,
    ),
    lastErrorCode,
    lastSyncedAt: new Date(),
    providerSync: { errorCode: null, status: "synced" },
    settings: sanitizeProviderObject(settings),
    taxDefaults: migratedTaxDefaults(legacy, data.fiscalDocuments),
    webhookRegistered,
  };
}

export async function seedSpedyFiscalConnection(tx, prepared, ids) {
  if (!prepared) return;
  const defaultsStatus =
    Object.keys(prepared.taxDefaults.nfe).length ||
    Object.keys(prepared.taxDefaults.nfse).length
      ? "unconfirmed"
      : "missing";
  await tx`INSERT INTO fiscal_provider_connections
    (id, capabilities, certificate_expires_at, company_id,
     credential_ciphertext, defaults_status, issuer_profile, last_error_code, last_synced_at,
     provider, status, store_id, tax_defaults, tenant_id,
     webhook_registered_at, created_at, updated_at)
    VALUES (
      ${targetId(ids.store, "FiscalProviderConnection", PROVIDER)},
      ${tx.json(prepared.capabilities)},
      ${prepared.certificateExpiresAt},
      ${prepared.companyId},
      ${prepared.credentialCiphertext},
      ${defaultsStatus},
      ${tx.json(prepared.issuerProfile)},
      ${prepared.lastErrorCode},
      ${prepared.lastSyncedAt},
      ${PROVIDER},
      'pending_review',
      ${ids.store},
      ${tx.json(prepared.taxDefaults)},
      ${ids.tenant},
      ${prepared.webhookRegistered ? new Date() : null},
      now(),
      now()
    )
    ON CONFLICT (store_id, provider) DO UPDATE SET
      capabilities=excluded.capabilities,
      certificate_expires_at=excluded.certificate_expires_at,
      company_id=excluded.company_id,
      credential_ciphertext=excluded.credential_ciphertext,
      defaults_status=CASE
        WHEN fiscal_provider_connections.defaults_status='confirmed'
          THEN 'confirmed'::fiscal_defaults_status
        ELSE excluded.defaults_status
      END,
      issuer_profile=excluded.issuer_profile,
      last_error_code=excluded.last_error_code,
      last_synced_at=COALESCE(
        excluded.last_synced_at,
        fiscal_provider_connections.last_synced_at
      ),
      status=CASE
        WHEN fiscal_provider_connections.defaults_status='confirmed'
          THEN fiscal_provider_connections.status
        ELSE 'pending_review'::fiscal_connection_status
      END,
      tax_defaults=CASE
        WHEN fiscal_provider_connections.defaults_status='confirmed'
          THEN fiscal_provider_connections.tax_defaults
        ELSE excluded.tax_defaults
      END,
      webhook_registered_at=COALESCE(
        excluded.webhook_registered_at,
        fiscal_provider_connections.webhook_registered_at
      ),
      updated_at=now()`;
}
