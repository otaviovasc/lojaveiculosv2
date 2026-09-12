import type {
  FiscalIssuerProfileInput,
  FiscalProviderAdminGateway,
} from "../../domains/fiscal/ports/fiscalProviderAdminGateway.js";
import { verifyOpaqueWebhookToken } from "./fiscalCredentialCodec.js";
import {
  arrayOfRecords,
  companyRequest,
  dateValue,
  digits,
  type Fetcher,
  type JsonRecord,
  listAllCompanies,
  ownerRequest,
  ownerUpload,
  requireEnv,
  sanitizeProviderRecord,
  stringValue,
  toRecord,
} from "./spedyHttpFiscalAdminClient.js";

export function createSpedyHttpFiscalAdminGateway(options: {
  env: Record<string, string | undefined>;
  fetcher?: Fetcher;
}): FiscalProviderAdminGateway {
  const { env, fetcher = fetch } = options;
  return {
    async ensureCompany(input) {
      const companies = await listAllCompanies(fetcher, env);
      const federalTaxNumber = digits(input.federalTaxNumber);
      const existing = companies.find(
        (company) =>
          digits(stringValue(company.federalTaxNumber)) === federalTaxNumber,
      );
      const company = existing
        ? await ownerRequest(
            fetcher,
            env,
            "PUT",
            `companies/${encodeURIComponent(requireId(existing))}`,
            input,
          )
        : await ownerRequest(fetcher, env, "POST", "companies", input);
      return {
        apiKey: readUsableApiKey(company),
        companyId: requireId(company),
        created: !existing,
        profile: sanitizeProviderRecord(company),
      };
    },
    async ensureWebhook() {
      const webhookUrl = requireEnv(env, "SPEDY_WEBHOOK_URL");
      const listed = await ownerRequest(fetcher, env, "GET", "webhooks");
      const items = arrayOfRecords(listed.items);
      const exists = items.some(
        (item) =>
          item.url === webhookUrl && item.event === "invoice.status_changed",
      );
      if (exists) return { registered: false };
      await ownerRequest(fetcher, env, "POST", "webhooks", {
        event: "invoice.status_changed",
        url: webhookUrl,
      });
      return { registered: true };
    },
    async syncCompany(companyId, companyApiKey) {
      const [profile, settings, certificates] = await Promise.all([
        ownerRequest(
          fetcher,
          env,
          "GET",
          `companies/${encodeURIComponent(companyId)}`,
        ),
        ownerRequest(
          fetcher,
          env,
          "GET",
          `companies/${encodeURIComponent(companyId)}/settings`,
        ).catch(() => ({})),
        ownerRequest(
          fetcher,
          env,
          "GET",
          `companies/${encodeURIComponent(companyId)}/certificates`,
        ).catch(() => ({})),
      ]);
      const city = toRecord(toRecord(profile.address).city);
      const cityCode = stringValue(city.code);
      const cityResult = cityCode
        ? await companyRequest(
            fetcher,
            env,
            companyApiKey,
            "GET",
            `service-invoices/cities?code=${encodeURIComponent(cityCode)}&pageSize=1`,
          ).catch(() => ({}))
        : {};
      const certificateRows = arrayOfRecords(toRecord(certificates).items);
      const expirationValues = certificateRows
        .map((row) => dateValue(row.expirationAt))
        .filter((value): value is Date => Boolean(value));
      const capabilityItem =
        arrayOfRecords(toRecord(cityResult).items)[0] ?? {};
      return {
        capabilities: {
          city: {
            code: cityCode ?? null,
            provider: toRecord(capabilityItem.provider),
          },
        },
        certificateExpiresAt:
          expirationValues.sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
        profile: sanitizeProviderRecord(profile),
        settings: sanitizeProviderRecord(settings),
      };
    },
    async uploadCertificate(input) {
      const form = new FormData();
      form.append("certificateFile", input.certificate);
      form.append("password", input.password);
      const payload = await ownerUpload(
        fetcher,
        env,
        `companies/${encodeURIComponent(input.companyId)}/certificates`,
        form,
      );
      return { expirationAt: dateValue(payload.expirationAt) };
    },
    verifyWebhookToken: (token) =>
      verifyOpaqueWebhookToken(env.SPEDY_WEBHOOK_URL, token),
  };
}

function readUsableApiKey(company: JsonRecord) {
  const apiKey = stringValue(toRecord(company.apiCredentials).apiKey);
  return apiKey && !apiKey.includes("*") ? apiKey : null;
}

function requireId(company: JsonRecord) {
  const id = stringValue(company.id);
  if (!id) throw new Error("Spedy company response has no identifier.");
  return id;
}
