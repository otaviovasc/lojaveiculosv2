import { describe, expect, it } from "vitest";
import { buildOlxChatCallbackUrl } from "./olxChatSetupRetrySupport.js";

const connectionId = "26000000-0000-4000-8000-000000000001";
const canonicalPath = `/api/v1/crm/webhooks/olx/${connectionId}/received`;

describe("buildOlxChatCallbackUrl", () => {
  it("reconstructs the callback from the server-owned canonical origin", () => {
    expect(
      buildOlxChatCallbackUrl({
        allowLocalHttp: false,
        canonicalApiOrigin: "https://api.example.test",
        connectionId,
        storedWebhookUrl: `https://api.example.test${canonicalPath}`,
        webhookSecret: "secret value",
      }),
    ).toBe(`https://api.example.test${canonicalPath}?token=secret+value`);
  });

  it.each([
    `https://attacker.example${canonicalPath}`,
    `https://user:password@api.example.test${canonicalPath}`,
    `https://api.example.test:444${canonicalPath}`,
    `https://api.example.test${canonicalPath}?next=https://attacker.example`,
    `https://api.example.test${canonicalPath}#fragment`,
  ])("rejects poisoned stored callback %s", (storedWebhookUrl) => {
    expect(() =>
      buildOlxChatCallbackUrl({
        allowLocalHttp: false,
        canonicalApiOrigin: "https://api.example.test",
        connectionId,
        storedWebhookUrl,
        webhookSecret: "secret",
      }),
    ).toThrow(/authorization is unavailable/i);
  });

  it("allows localhost HTTP only when local or test policy enables it", () => {
    const input = {
      canonicalApiOrigin: "http://localhost:8787",
      connectionId,
      storedWebhookUrl: `http://localhost:8787${canonicalPath}`,
      webhookSecret: "secret",
    };

    expect(buildOlxChatCallbackUrl({ ...input, allowLocalHttp: true })).toBe(
      `http://localhost:8787${canonicalPath}?token=secret`,
    );
    expect(() =>
      buildOlxChatCallbackUrl({ ...input, allowLocalHttp: false }),
    ).toThrow(/authorization is unavailable/i);
    expect(() =>
      buildOlxChatCallbackUrl({
        ...input,
        allowLocalHttp: true,
        canonicalApiOrigin: "http://api.example.test:8787",
        storedWebhookUrl: `http://api.example.test:8787${canonicalPath}`,
      }),
    ).toThrow(/authorization is unavailable/i);
  });
});
