import { describe, expect, it, vi } from "vitest";
import {
  CrmConnectionSetupProviderError,
  type ZapiConnectionSetupProvider,
} from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  connectionId,
  createConnection,
  customerStoreId,
  customerTenantId,
} from "./crm.whatsapp.connectionSetupRoutes.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp customer pairing provider states", () => {
  it("returns the safe phone fallback when Z-API requires Passkey", async () => {
    const app = createPairingApp({
      getPairingCode: vi.fn(),
      getQrCode: vi.fn(async () => {
        throw new CrmConnectionSetupProviderError(
          "Z-API requires another pairing method. Try connecting by phone.",
          "pairing_method_required",
        );
      }),
      validateStatus: vi.fn(async () => disconnectedStatus),
    });

    const response = await app.request(pairingPath("qr"), { method: "POST" });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_CONNECTION_SETUP_PAIRING_METHOD_REQUIRED",
      details: { nextAction: "request_phone_code" },
    });
  });

  it("requires provider disconnect before QR or phone pairing", async () => {
    const getPairingCode = vi.fn();
    const getQrCode = vi.fn();
    const app = createPairingApp({
      getPairingCode,
      getQrCode,
      validateStatus: vi.fn(async () => ({
        connected: false,
        connectedPhone: "5511999999999",
        smartphoneConnected: true,
      })),
    });

    const qr = await app.request(pairingPath("qr"), { method: "POST" });
    const code = await app.request(pairingPath("code"), {
      body: JSON.stringify({ phone: "5511999999999" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    for (const response of [qr, code]) {
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        code: "CRM_CONNECTION_SETUP_PAIRING_DISCONNECT_REQUIRED",
        details: { nextAction: "disconnect_connection" },
      });
    }
    expect(getQrCode).not.toHaveBeenCalled();
    expect(getPairingCode).not.toHaveBeenCalled();
  });
});

const disconnectedStatus = {
  connected: false,
  connectedPhone: null,
  smartphoneConnected: false,
};

function createPairingApp(
  zapiConnectionSetupProvider: ZapiConnectionSetupProvider,
) {
  return createTestApp({
    crmConnectionCredentialVault: {
      open: vi.fn(async ({ sealed }: { sealed: string }) =>
        sealed.replace(/^sealed:/, ""),
      ),
      seal: vi.fn(),
    },
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      {
        ...createConnection("zapi", {
          mode: "stored",
          stored: {
            instanceId: "sealed:instance-secret",
            instanceToken: "sealed:token-secret",
          },
        }),
        status: "disconnected",
        storeId: customerStoreId,
        tenantId: customerTenantId,
      },
    ]),
    zapiConnectionSetupProvider,
  });
}

function pairingPath(method: "code" | "qr") {
  return `/api/v1/crm/channel-connections/${connectionId}/zapi/pairing/${method}`;
}
