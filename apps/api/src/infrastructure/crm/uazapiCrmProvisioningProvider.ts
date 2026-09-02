import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import type { CrmUazapiProvisioningProvider } from "../../domains/crm/ports/crmUazapiProvisioningProvider.js";
import {
  normalizeUazapiBaseUrl,
  parseJson,
  readRecord,
  readString,
  UAZAPI_DEFAULT_BASE_URL,
} from "./uazapiCrmWhatsappGatewaySupport.js";
import { readUazapiTimeoutMs } from "./uazapiCrmConnectionSetupSupport.js";

export function createUazapiCrmProvisioningProvider(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmUazapiProvisioningProvider {
  const timeoutMs = readUazapiTimeoutMs(env.CRM_UAZAPI_REQUEST_TIMEOUT_MS);
  const adminToken = () => {
    const token = env.CRM_UAZAPI_ADMIN_TOKEN?.trim();
    if (!token) {
      throw new CrmConnectionSetupProviderError(
        "CRM_UAZAPI_ADMIN_TOKEN is not configured",
        "configuration_error",
      );
    }
    return token;
  };

  return {
    async createInstance(input) {
      const baseUrl = normalizeUazapiBaseUrl(
        env.CRM_UAZAPI_BASE_URL?.trim() || UAZAPI_DEFAULT_BASE_URL,
      );
      const payload = await requestUazapiAdmin(
        baseUrl,
        adminToken(),
        "/instance/create",
        {
          body: {
            name: input.name,
            ...(input.adminField01 ? { adminField01: input.adminField01 } : {}),
            ...(input.adminField02 ? { adminField02: input.adminField02 } : {}),
          },
          method: "POST",
        },
        timeoutMs,
        fetchImpl,
      );
      const instance = readRecord(payload.instance);
      const instanceToken =
        readString(instance.token) ?? readString(payload.token);
      const instanceId =
        readString(instance.id) ??
        readString(instance.name) ??
        readString(payload.name) ??
        input.name.trim();
      if (!instanceToken || !instanceId) {
        throw new CrmConnectionSetupProviderError(
          "UAZAPI did not return the created instance credentials",
          "invalid_provider_response",
        );
      }
      return { baseUrl, instanceId, instanceToken };
    },
    async deleteInstance(input) {
      const baseUrl = normalizeUazapiBaseUrl(
        input.baseUrl?.trim() ||
          env.CRM_UAZAPI_BASE_URL?.trim() ||
          UAZAPI_DEFAULT_BASE_URL,
      );
      await requestUazapiAdmin(
        baseUrl,
        adminToken(),
        "/instance",
        { body: { id: input.instanceId }, method: "DELETE" },
        timeoutMs,
        fetchImpl,
      );
    },
  };
}

async function requestUazapiAdmin(
  baseUrl: string,
  token: string,
  path: string,
  init: { body: Record<string, unknown>; method: "DELETE" | "POST" },
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      body: JSON.stringify(init.body),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        admintoken: token,
      },
      method: init.method,
      redirect: "error",
      signal: controller.signal,
    });
    const payload = parseJson(await response.text());
    if (!response.ok) {
      throw new CrmConnectionSetupProviderError(
        `UAZAPI admin request was rejected with HTTP ${response.status}`,
        response.status === 429 ? "rate_limited" : "provider_rejected",
        response.status,
      );
    }
    if (payload.error === true) {
      const message =
        readString(payload.message) ?? readString(payload.response);
      throw new CrmConnectionSetupProviderError(
        message
          ? `UAZAPI rejected the admin request: ${message}`
          : "UAZAPI rejected the admin request",
        "provider_rejected",
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof CrmConnectionSetupProviderError) throw error;
    if (controller.signal.aborted) {
      throw new CrmConnectionSetupProviderError(
        "UAZAPI admin request timed out",
        "timeout",
      );
    }
    throw new CrmConnectionSetupProviderError(
      "UAZAPI admin request failed before receiving a response",
      "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}
