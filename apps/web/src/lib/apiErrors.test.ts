import { describe, expect, it } from "vitest";
import { AppApiError, readApiJson, readApiVoid } from "./apiErrors";

describe("api error helpers", () => {
  it("reads successful JSON and empty responses", async () => {
    await expect(
      readApiJson<{ id: string }>(
        new Response(JSON.stringify({ id: "vehicle_1" }), { status: 200 }),
      ),
    ).resolves.toEqual({ id: "vehicle_1" });

    await expect(
      readApiVoid(new Response(null, { status: 204 })),
    ).resolves.toBe(undefined);
  });

  it("preserves backend error payloads and request ids", async () => {
    const response = new Response(
      JSON.stringify({
        code: "HTTP_AUTHENTICATION_REQUIRED",
        message:
          "Authenticated HTTP context requires Clerk user and store slug",
        requestId: "req_401",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 401,
      },
    );

    await expect(
      readApiJson(response, { feature: "Inventory" }),
    ).rejects.toMatchObject({
      code: "HTTP_AUTHENTICATION_REQUIRED",
      requestId: "req_401",
      status: 401,
      technicalMessage:
        "Authenticated HTTP context requires Clerk user and store slug",
      userMessage:
        "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.",
    });
  });

  it("falls back to response headers when the body has no request id", async () => {
    const response = new Response("Service unavailable", {
      headers: { "X-Request-Id": "req_header" },
      status: 503,
    });

    await expect(
      readApiVoid(response, { feature: "Inventory" }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      requestId: "req_header",
      status: 503,
      userMessage: "Erro interno do servidor. Tente novamente em instantes.",
    });
  });

  it("supports standard structured JSON error media types", async () => {
    const response = new Response(
      JSON.stringify({
        details: { field: "storeId" },
        message: "The selected store is not available.",
        requestId: "req_problem",
      }),
      {
        headers: { "Content-Type": "application/problem+json; charset=utf-8" },
        status: 422,
      },
    );

    await expect(
      readApiJson(response, {
        endpoint: "/api/v1/stores",
        feature: "Stores",
      }),
    ).rejects.toMatchObject({
      code: "HTTP_422",
      details: { field: "storeId" },
      endpoint: "/api/v1/stores",
      requestId: "req_problem",
      technicalMessage: "The selected store is not available.",
    });
  });

  it("uses safe fallbacks for malformed JSON and blank metadata", async () => {
    const malformed = new Response("{", {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
    await expect(
      readApiJson(malformed, { feature: "Billing" }),
    ).rejects.toMatchObject({
      code: "REQUEST_VALIDATION_ERROR",
      technicalMessage: "Billing request failed. HTTP 400.",
      userMessage: "Revise os campos informados e tente novamente.",
    });

    const blankMetadata = new Response(
      JSON.stringify({ code: " ", message: " ", requestId: " " }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "   ",
        },
        status: 403,
      },
    );
    const error = await rejectedApiError(blankMetadata, { feature: "CRM" });
    expect(error).toMatchObject({
      code: "HTTP_AUTHORIZATION_DENIED",
      technicalMessage: "CRM request failed. HTTP 403.",
    });
    expect(error.requestId).toBeUndefined();
  });

  it("prefers the body request id over the correlation header", async () => {
    const response = new Response(
      JSON.stringify({ message: "Conflict", requestId: "  req_body  " }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "  req_header  ",
        },
        status: 409,
      },
    );

    await expect(readApiVoid(response)).rejects.toMatchObject({
      requestId: "req_body",
    });
  });

  it.each([
    [400, "REQUEST_VALIDATION_ERROR"],
    [401, "HTTP_AUTHENTICATION_REQUIRED"],
    [403, "HTTP_AUTHORIZATION_DENIED"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [429, "RATE_LIMIT"],
    [500, "INTERNAL_SERVER_ERROR"],
    [418, "HTTP_418"],
  ])("derives a stable code for HTTP %i", async (status, code) => {
    await expect(
      readApiVoid(new Response(null, { status })),
    ).rejects.toMatchObject({ code });
  });
});

async function rejectedApiError(
  response: Response,
  options?: { endpoint?: string; feature?: string },
): Promise<AppApiError> {
  try {
    await readApiVoid(response, options);
  } catch (error) {
    expect(error).toBeInstanceOf(AppApiError);
    return error as AppApiError;
  }

  throw new Error("Expected the API response to be rejected");
}
