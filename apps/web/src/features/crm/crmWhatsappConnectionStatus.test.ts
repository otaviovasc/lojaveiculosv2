import { describe, expect, it } from "vitest";
import {
  readCrmWhatsappProviderLabel,
  readWhatsappStatus,
} from "./crmWhatsappConnectionStatus";

describe("readWhatsappStatus", () => {
  it("prioritizes the live connection state with a provider-neutral label", () => {
    expect(
      readWhatsappStatus({
        connectionError: new Error("previous failure"),
        hasConnection: true,
        isLoading: false,
      }),
    ).toEqual({ label: "Canal conectado", tone: "online" });
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
    ).toEqual({ label: "Provedor indisponivel", tone: "error" });
    expect(
      readWhatsappStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Desconectado", tone: "offline" });
  });

  it("distinguishes Z-API, official WhatsApp, and Instagram providers", () => {
    expect(readCrmWhatsappProviderLabel("zapi")).toBe("Z-API");
    expect(readCrmWhatsappProviderLabel("composio_whatsapp")).toBe(
      "WhatsApp oficial",
    );
    expect(readCrmWhatsappProviderLabel("composio_instagram")).toBe(
      "Instagram",
    );
    expect(
      readWhatsappStatus({
        connectionError: null,
        hasConnection: true,
        isLoading: false,
        provider: "composio_instagram",
      }),
    ).toEqual({ label: "Instagram: online", tone: "online" });
  });
});
