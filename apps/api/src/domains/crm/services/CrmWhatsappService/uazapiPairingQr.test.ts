import { describe, expect, it, vi } from "vitest";
import { requestUazapiPairingQr } from "./uazapiPairingQr.js";
import {
  connectedStatus,
  connectionId,
  createContext,
  createPorts,
  disconnectedStatus,
} from "./uazapiConnectionSetup.testSupport.js";

describe("uazapi pairing QR", () => {
  it("issues a pairing QR for a disconnected instance with provider expiry", async () => {
    const getQrCode = vi.fn(async () => ({
      dataUri: "data:image/png;base64,uazapi-qr",
      expiresInSeconds: 60,
    }));
    const ports = createPorts({
      provider: {
        getQrCode,
        validateStatus: vi.fn(async () => disconnectedStatus),
      },
    });

    const result = await requestUazapiPairingQr(
      createContext(),
      { connectionId },
      ports,
    );

    expect(result.qrCode).toBe("data:image/png;base64,uazapi-qr");
    const ttlMs = new Date(result.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(50_000);
    expect(ttlMs).toBeLessThanOrEqual(60_000);
  });

  it("refuses pairing while a device is still connected", async () => {
    const getQrCode = vi.fn();
    const ports = createPorts({
      provider: {
        getQrCode,
        validateStatus: vi.fn(async () => connectedStatus),
      },
    });

    await expect(
      requestUazapiPairingQr(createContext(), { connectionId }, ports),
    ).rejects.toMatchObject({
      code: "pairing_disconnect_required",
    });
    expect(getQrCode).not.toHaveBeenCalled();
  });
});
