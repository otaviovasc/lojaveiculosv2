import { describe, expect, it } from "vitest";
import {
  readCrmChannelLabel,
  readCrmProviderIcon,
  readCrmProviderLabel,
  readCrmConnectionStatus,
} from "./crmConnectionStatus";

describe("readCrmConnectionStatus", () => {
  it("prioritizes the live connection state with a provider-neutral label", () => {
    expect(
      readCrmConnectionStatus({
        connectionError: new Error("previous failure"),
        hasConnection: true,
        isLoading: false,
      }),
    ).toEqual({ label: "Canal conectado", tone: "online" });
  });

  it("describes loading, provider errors, and disconnected states", () => {
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: true,
      }),
    ).toEqual({ label: "Verificando", tone: "loading" });
    expect(
      readCrmConnectionStatus({
        connectionError: new Error("zapi down"),
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Provedor indisponivel", tone: "error" });
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: false,
        isLoading: false,
      }),
    ).toEqual({ label: "Desconectado", tone: "offline" });
  });

  it("keeps human provider and channel labels for OLX Chat", () => {
    expect(readCrmProviderLabel("olx")).toBe("OLX Chat");
    expect(readCrmProviderIcon("olx")).toBe("olx");
    expect(readCrmChannelLabel("olx_chat")).toBe("OLX Chat");
    expect(
      readCrmConnectionStatus({
        connectionError: null,
        hasConnection: true,
        isLoading: false,
        provider: "olx",
      }),
    ).toEqual({ label: "OLX Chat: online", tone: "online" });
  });

  it("distinguishes Z-API, official WhatsApp, and Instagram providers", () => {
    expect(readCrmProviderLabel("zapi")).toBe("Z-API");
    expect(readCrmProviderLabel("meta_cloud")).toBe("WhatsApp oficial");
    expect(readCrmChannelLabel("instagram")).toBe("Instagram");
  });
});
