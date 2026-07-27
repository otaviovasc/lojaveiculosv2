import { json, targetId } from "./common.mjs";
import { log } from "./log.mjs";
import {
  encryptSpedyCredential,
  ensureSpedyWebhook,
  latestCertificateExpiration,
  listSpedyInvoices,
  requireSpedyEnvironment,
  sanitizeProviderObject,
  spedyRequest,
} from "./spedy-fiscal-client.mjs";
import {
  normalizeFiscalKind,
  reconcileSpedyFiscalDocuments,
  requiredString,
} from "./spedy-fiscal-reconciliation.mjs";

export { encryptSpedyCredential } from "./spedy-fiscal-client.mjs";
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
  const [productInvoices, serviceInvoices, company, settings, certificates] =
    await Promise.all([
      listSpedyInvoices(env, companyApiKey, "product-invoices"),
      listSpedyInvoices(env, companyApiKey, "service-invoices"),
      spedyRequest(env, env.SPEDY_OWNER_API_KEY, `companies/${companyId}`),
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
  const webhookRegistered = config.apply
    ? await ensureSpedyWebhook(env)
    : false;
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
     credential_ciphertext, defaults_status, issuer_profile, last_synced_at,
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
      now(),
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
      last_error_code=null,
      last_synced_at=excluded.last_synced_at,
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

function migratedTaxDefaults(legacy, fiscalDocuments) {
  const reference = [...fiscalDocuments]
    .filter(
      (row) =>
        normalizeFiscalKind(row.docType) === "nfe" &&
        String(row.status).toLowerCase() === "authorized",
    )
    .sort(
      (left, right) =>
        new Date(right.issuedAt ?? right.updatedAt).getTime() -
        new Date(left.issuedAt ?? left.updatedAt).getTime(),
    )
    .find((row) => {
      const metadata = json(row.metadata);
      return metadata.operationNature || metadata.operationType;
    });
  const referenceMetadata = json(reference?.metadata);
  const nfse = json(legacy.nfseConfig);
  return {
    nfe: {
      ...json(legacy.nfeTaxDefaults),
      ...(referenceMetadata.operationNature
        ? { operationNature: referenceMetadata.operationNature }
        : {}),
      ...(referenceMetadata.operationType
        ? { operationType: referenceMetadata.operationType }
        : {}),
      ...(referenceMetadata.purposeType
        ? { purposeType: referenceMetadata.purposeType }
        : {}),
      referenceInvoiceId: reference?.invoiceId ?? null,
    },
    nfse: {
      ...nfse,
      taxLocation: nfse.defaultTaxLocation ?? null,
      taxationType: nfse.defaultTaxationType ?? null,
    },
  };
}
