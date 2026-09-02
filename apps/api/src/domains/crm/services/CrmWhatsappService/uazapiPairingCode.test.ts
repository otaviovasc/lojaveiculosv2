import { describe, expect, it, vi } from "vitest";
import { CrmConnectionSetupProviderError } from "../../ports/crmConnectionSetupProvider.js";
import { requestUazapiPairingCode } from "./uazapiPairingCode.js";
import {
  connection,
  connectionId,
  createContext,
  createPorts,
  disconnectedStatus,
} from "./uazapiConnectionSetup.testSupport.js";

describe("uazapi pairing code", () => {
  it("falls back to the connection phone and normalizes digits for pair codes", async () => {
    const getPairingCode = vi.fn(async () => ({
      code: "1234-5678",
      kind: "code" as const,
    }));
    const ports = createPorts({
      connection: connection({ phone: "+55 (11) 99999-0000" }),
      provider: {
        getPairingCode,
        validateStatus: vi.fn(async () => disconnectedStatus),
      },
    });

    const result = await requestUazapiPairingCode(
      createContext(),
      { connectionId },
      ports,
    );

    expect(getPairingCode).toHaveBeenCalledWith(
      {
        apiBaseUrl: "https://uazapi.test",
        instanceId: "instance-1",
        instanceToken: "instance-token-1",
      },
      "5511999990000",
    );
    expect(result.code).toBe("1234-5678");
    const ttlMs = new Date(result.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(290_000);
    expect(ttlMs).toBeLessThanOrEqual(300_000);
  });

  it("requires a phone when neither input nor connection carries one", async () => {
    const ports = createPorts({
      provider: { validateStatus: vi.fn(async () => disconnectedStatus) },
    });

    await expect(
      requestUazapiPairingCode(createContext(), { connectionId }, ports),
    ).rejects.toBeInstanceOf(CrmConnectionSetupProviderError);
  });
});
