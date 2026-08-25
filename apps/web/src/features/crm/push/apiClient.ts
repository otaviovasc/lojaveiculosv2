import { readApiJson, readApiVoid } from "../../../lib/apiErrors";
import type { CrmPushSettings } from "./types";

export type CrmPushApi = {
  disableSubscription: (
    subscriptionId: string,
    options?: { keepalive?: boolean },
  ) => Promise<void>;
  getSettings: () => Promise<CrmPushSettings>;
  registerSubscription: (subscriptionId: string) => Promise<void>;
  updatePreference: (enabled: boolean) => Promise<void>;
};

export function createCrmPushApi(options: {
  baseUrl?: string;
  fetch: typeof fetch;
  headers?: () => HeadersInit | Promise<HeadersInit>;
}): CrmPushApi {
  const request = async (
    path: string,
    init?: RequestInit,
  ): Promise<Response> => {
    const headers = new Headers(await options.headers?.());
    if (init?.body !== undefined)
      headers.set("Content-Type", "application/json");
    return options.fetch(endpoint(path, options.baseUrl), { ...init, headers });
  };

  return {
    disableSubscription: async (subscriptionId, requestOptions) => {
      const path = `/crm/push/subscriptions/${encodeURIComponent(subscriptionId)}`;
      const response = await request(path, {
        keepalive: requestOptions?.keepalive ?? false,
        method: "DELETE",
      });
      await readApiVoid(response, {
        endpoint: path,
        feature: "Notificações do CRM",
      });
    },
    getSettings: async () => {
      const path = "/crm/push/settings";
      return readApiJson<CrmPushSettings>(await request(path), {
        endpoint: path,
        feature: "Notificações do CRM",
      });
    },
    registerSubscription: async (subscriptionId) => {
      const path = "/crm/push/subscriptions";
      const response = await request(path, {
        body: JSON.stringify({ subscriptionId }),
        method: "POST",
      });
      await readApiVoid(response, {
        endpoint: path,
        feature: "Notificações do CRM",
      });
    },
    updatePreference: async (enabled) => {
      const path = "/crm/push/preferences";
      const response = await request(path, {
        body: JSON.stringify({ enabled }),
        method: "PATCH",
      });
      await readApiVoid(response, {
        endpoint: path,
        feature: "Notificações do CRM",
      });
    },
  };
}

function endpoint(path: string, baseUrl?: string) {
  return `${(baseUrl ?? "/api/v1").replace(/\/$/, "")}${path}`;
}
