import { describe, expect, it, vi } from "vitest";
import { CrmConnectionSetupProviderError } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  connectionId,
  createGateway,
  createSetupProvider,
  createUazapiConnection,
} from "./crm.channelConnections.uazapiSetup.testSupport.js";

describe("CRM uazapi pairing code error mapping", () => {
  it("returns 400 with a clear code when the pairing phone is invalid", async () => {
    const provider = createSetupProvider({
      getPairingCode: vi.fn(async () => {
        throw new CrmConnectionSetupProviderError(
          "UAZAPI pairing phone must be a valid Brazilian number",
          "pairing_phone_invalid",
          400,
          undefined,
          undefined,
          false,
        );
      }),
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createUazapiConnection(),
      ]),
      crmMessagingGateway: createGateway({}),
      uazapiConnectionSetupProvider: provider,
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/pairing/code`,
      {
        body: JSON.stringify({ phone: "11999999" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_CONNECTION_SETUP_PAIRING_PHONE_INVALID",
      retryable: false,
    });
  });
});
