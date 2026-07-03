import { describe, expect, it } from "vitest";
import { readWhatsappStatus } from "./crmWhatsappConnectionStatus";

describe("readWhatsappStatus", () => {
  it("prioritizes the live connection state when ZAPI is connected", () => {
    expect(
      readWhatsappStatus({
        connectionError: new Error("previous failure"),
        hasConnection: true,
        isLoading: false,
      }),
    ).toEqual({ label: "ZAPI conectado", tone: "online" });
  });

  it("describes loading, provider errors, and disconnected states", () => {
    expect(
      readWhatsappStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: true,
      }),
    ).toEqual({ label: "Verificando", tone: "loading" });
    expect(
      readWhatsappStatus({
        connectionError: new Error("zapi down"),
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "ZAPI indisponivel", tone: "error" });
    expect(
      readWhatsappStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Desconectado", tone: "offline" });
  });
});
