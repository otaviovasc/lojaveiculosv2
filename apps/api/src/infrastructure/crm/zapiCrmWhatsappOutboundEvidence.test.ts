import { describe, expect, it, vi } from "vitest";
import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  sendZapiCatalog,
  sendZapiProduct,
} from "./zapiCrmWhatsappCatalogActions.js";
import { sendZapiMedia } from "./zapiCrmWhatsappMediaActions.js";
import {
  removeZapiReaction,
  sendZapiReaction,
} from "./zapiCrmWhatsappMessageActions.js";
import { sendZapiText } from "./zapiCrmWhatsappTextActions.js";
import type { ZapiCredentials } from "./zapiCrmWhatsappGatewaySupport.js";

const credentials: ZapiCredentials = {
  apiBaseUrl: "https://api.z-api.io",
  clientToken: "client-token-1",
  instanceId: "instance-1",
  instanceToken: "instance-token-1",
};

function response(body: string) {
  return vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(new Response(body, { status: 200 }));
}

async function expectMissingEvidence(result: Promise<unknown>) {
  const error = await result.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(CrmMessagingGatewayError);
  expect(error).toMatchObject({
    code: "request_failed",
    status: 502,
  });
  expect((error as Error).message).not.toContain("provider-secret");
}

describe("Z-API outbound provider evidence", () => {
  it.each([
    ["empty body", ""],
    ["empty object", "{}"],
    ["malformed JSON", "provider-secret"],
    ["empty id", JSON.stringify({ messageId: " " })],
    ["non-string id", JSON.stringify({ messageId: 123 })],
    ["object id", JSON.stringify({ messageId: { value: "id" } })],
    ["oversized id", JSON.stringify({ messageId: "x".repeat(513) })],
  ])("rejects text success with %s", async (_label, body) => {
    await expectMissingEvidence(
      sendZapiText(credentials, response(body), {
        phone: "5511999999999",
        text: "Ola",
      }),
    );
  });

  it.each([
    [
      "media",
      (fetchImpl: typeof fetch) =>
        sendZapiMedia(credentials, fetchImpl, {
          mediaType: "image",
          mediaUrl: "https://cdn.example.test/vehicle.jpg",
          phone: "5511999999999",
        }),
    ],
    [
      "catalog",
      (fetchImpl: typeof fetch) =>
        sendZapiCatalog(credentials, fetchImpl, {
          catalogPhone: "5511888888888",
          phone: "5511999999999",
        }),
    ],
    [
      "product",
      (fetchImpl: typeof fetch) =>
        sendZapiProduct(credentials, fetchImpl, {
          catalogPhone: "5511888888888",
          phone: "5511999999999",
          productId: "product-1",
        }),
    ],
    [
      "reaction",
      (fetchImpl: typeof fetch) =>
        sendZapiReaction(credentials, fetchImpl, {
          messageId: "message-1",
          phone: "5511999999999",
          reaction: "👍",
        }),
    ],
    [
      "reaction removal",
      (fetchImpl: typeof fetch) =>
        removeZapiReaction(credentials, fetchImpl, {
          messageId: "message-1",
          phone: "5511999999999",
        }),
    ],
  ])("rejects %s success without provider evidence", async (_label, send) => {
    await expectMissingEvidence(send(response("{}")));
  });

  it.each(["messageId", "zaapId", "id", "externalId"])(
    "accepts a real %s from Z-API",
    async (field) => {
      const result = await sendZapiText(
        credentials,
        response(JSON.stringify({ [field]: "provider-message-1" })),
        { phone: "5511999999999", text: "Ola" },
      );

      expect(result.externalId).toBe("provider-message-1");
    },
  );
});
