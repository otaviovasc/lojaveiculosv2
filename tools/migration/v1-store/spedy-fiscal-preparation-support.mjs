import { json } from "./common.mjs";
import {
  encryptSpedyCredential,
  latestCertificateExpiration,
  sanitizeProviderObject,
} from "./spedy-fiscal-client.mjs";
import {
  normalizeFiscalKind,
  preserveLegacyFiscalDocuments,
} from "./spedy-fiscal-reconciliation.mjs";

export function degradedFiscalMigration(
  data,
  config,
  legacy,
  companyId,
  companyApiKey,
  env,
  errorCode,
  taxDefaults,
) {
  const legacyNfse = json(legacy.nfseConfig);
  const providerSync = {
    errorCode: providerErrorCode({ code: errorCode }),
    status: "unavailable",
  };
  return {
    capabilities: {
      city: {
        code: legacy.cityCode ?? legacyNfse.cityCode ?? null,
        provider: { options: json(legacyNfse.providerOptions) },
      },
      migratedFromV1: true,
      nfse: { providerOptions: json(legacyNfse.providerOptions) },
      providerSync,
      supportedDocuments: ["nfe", "nfse"],
    },
    certificateExpiresAt: latestCertificateExpiration([], legacy),
    companyId,
    credentialCiphertext: encryptSpedyCredential(
      companyApiKey,
      env.FISCAL_CREDENTIAL_ENCRYPTION_KEY,
    ),
    fiscalDocuments: preserveLegacyFiscalDocuments(
      data.fiscalDocuments,
      config,
    ),
    issuerProfile: sanitizeProviderObject(legacy.companyInfo),
    lastErrorCode: providerSync.errorCode,
    lastSyncedAt: null,
    providerSync,
    settings: {},
    taxDefaults,
    webhookRegistered: false,
  };
}

export function providerErrorCode(
  error,
  fallback = "spedy_provider_unavailable",
) {
  const value = String(error?.code ?? fallback);
  return /^[a-z0-9_-]{1,120}$/i.test(value) ? value : fallback;
}

export function migratedTaxDefaults(legacy, fiscalDocuments) {
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
