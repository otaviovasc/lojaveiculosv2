import { describe, expect, it } from "vitest";
import { buildCrmConnectionOptions } from "./CrmConnectionSelect";
import type { CrmProviderConnection } from "./crmConversationTypes";

function createConnection(
  overrides: Partial<CrmProviderConnection> & { id: string },
): CrmProviderConnection {
  return {
    capabilities: ["conversation_start", "outbound", "text"],
    channel: "whatsapp",
    displayName: "WhatsApp",
    provider: "zapi",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    state: "active",
    ...overrides,
  };
}

describe("buildCrmConnectionOptions", () => {
  it("labels options channel-first with provider and phone", () => {
    const options = buildCrmConnectionOptions([
      createConnection({ id: "a", phoneNumber: "5511999999999" }),
    ]);

    expect(options).toEqual([
      { label: "WhatsApp · Z-API · 5511999999999", value: "a" },
    ]);
  });

  it("disambiguates identical labels with the display name", () => {
    const options = buildCrmConnectionOptions([
      createConnection({
        displayName: "Matriz",
        id: "a",
        phoneNumber: "5511999999999",
      }),
      createConnection({
        displayName: "Filial",
        id: "b",
        phoneNumber: "5511999999999",
      }),
    ]);

    expect(options.map((option) => option.label)).toEqual([
      "WhatsApp · Z-API · 5511999999999 · Matriz",
      "WhatsApp · Z-API · 5511999999999 · Filial",
    ]);
  });

  it("falls back to a short id suffix when nothing else distinguishes", () => {
    const options = buildCrmConnectionOptions([
      createConnection({ id: "24000000-0000-4000-8000-000000000aa1" }),
      createConnection({ id: "24000000-0000-4000-8000-000000000bb2" }),
    ]);

    const labels = options.map((option) => option.label);
    expect(new Set(labels).size).toBe(2);
    expect(labels[0]).toContain("…0aa1");
    expect(labels[1]).toContain("…0bb2");
  });
});
