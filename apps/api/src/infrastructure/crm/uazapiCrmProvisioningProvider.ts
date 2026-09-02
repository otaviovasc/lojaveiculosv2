import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import type {
  CrmUazapiInstanceSummary,
  CrmUazapiProvisioningProvider,
} from "../../domains/crm/ports/crmUazapiProvisioningProvider.js";
import {
  normalizeUazapiBaseUrl,
  readRecord,
  readString,
  redactUazapiTokenInText,
  UAZAPI_DEFAULT_BASE_URL,
} from "./uazapiCrmWhatsappGatewaySupport.js";
import { readUazapiTimeoutMs } from "./uazapiCrmConnectionSetupSupport.js";

export function createUazapiCrmProvisioningProvider(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmUazapiProvisioningProvider {
  const timeoutMs = readUazapiTimeoutMs(env.CRM_UAZAPI_REQUEST_TIMEOUT_MS);
  const resolveBaseUrl = (candidate?: string) =>
    normalizeUazapiBaseUrl(
      candidate?.trim() ||
        env.CRM_UAZAPI_BASE_URL?.trim() ||
        UAZAPI_DEFAULT_BASE_URL,
    );

  return {
    async createInstance(input) {
      const baseUrl = resolveBaseUrl(input.baseUrl);
      const payload = readRecord(
        await requestUazapiAdmin(
          baseUrl,
          input.adminToken,
          "/instance/create",
          {
            body: {
              name: input.name,
              ...(input.adminField01
                ? { adminField01: input.adminField01 }
                : {}),
              ...(input.adminField02
                ? { adminField02: input.adminField02 }
                : {}),
            },
            method: "POST",
          },
          timeoutMs,
          fetchImpl,
        ),
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
      await requestUazapiAdmin(
        resolveBaseUrl(input.baseUrl),
        input.adminToken,
        "/instance",
        { body: { id: input.instanceId }, method: "DELETE" },
        timeoutMs,
        fetchImpl,
      );
    },
    async listInstances(input) {
      const payload = await requestUazapiAdmin(
        resolveBaseUrl(input.baseUrl),
        input.adminToken,
        "/instance/all",
        { method: "GET" },
        timeoutMs,
        fetchImpl,
      );
      const entries = Array.isArray(payload)
        ? payload
        : readRecordList(readRecord(payload).instances);
      const instances: CrmUazapiInstanceSummary[] = [];
      for (const entry of entries) {
        const instance = readRecord(entry);
        const id = readString(instance.id) ?? readString(instance.name);
        const token = readString(instance.token);
        if (!id || !token) continue;
        instances.push({
          connectedPhone: readConnectedPhone(instance.owner),
          id,
          name: readString(instance.name) ?? id,
          status: readString(instance.status) ?? "disconnected",
          token,
        });
      }
      return instances;
    },
  };
}

function readRecordList(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Parses an admin response body, preserving top-level arrays (list endpoints). */
function parseAdminJson(text: string): unknown {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Strips the WhatsApp JID suffix from an owner like `5511…@s.whatsapp.net`. */
function readConnectedPhone(owner: unknown): string | null {
  const raw = readString(owner);
  if (!raw) return null;
  const phone = raw.split("@")[0]?.trim();
  return phone || null;
}

async function requestUazapiAdmin(
  baseUrl: string,
  token: string,
  path: string,
  init: { body?: Record<string, unknown>; method: "DELETE" | "GET" | "POST" },
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const adminToken = token.trim();
  if (!adminToken) {
    throw new CrmConnectionSetupProviderError(
      "UAZAPI admin token is required",
      "configuration_error",
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        admintoken: adminToken,
      },
      method: init.method,
      redirect: "error",
      signal: controller.signal,
    });
    const payload = parseAdminJson(await response.text());
    const record: Record<string, unknown> = Array.isArray(payload)
      ? {}
      : readRecord(payload);
    if (!response.ok) {
      throw new CrmConnectionSetupProviderError(
        `UAZAPI admin request was rejected with HTTP ${response.status}`,
        response.status === 429 ? "rate_limited" : "provider_rejected",
        response.status,
      );
    }
    if (record.error === true) {
      const message = readString(record.message) ?? readString(record.response);
      throw new CrmConnectionSetupProviderError(
        message
          ? `UAZAPI rejected the admin request: ${redactUazapiTokenInText(message, adminToken)}`
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
