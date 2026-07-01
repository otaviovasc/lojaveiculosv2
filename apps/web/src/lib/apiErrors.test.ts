import { describe, expect, it } from "vitest";
import {
  AppApiError,
  formatApiErrorDisplay,
  getApiErrorDisplay,
  readApiJson,
  readApiVoid,
} from "./apiErrors";

describe("api error helpers", () => {
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

  it("returns UI display data for AppApiError instances", () => {
    const error = new AppApiError({
      code: "HTTP_AUTHENTICATION_REQUIRED",
      message: "technical auth message",
      requestId: "req_ui",
      status: 401,
    });

    expect(getApiErrorDisplay(error, "Fallback")).toEqual({
      message:
        "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.",
      requestId: "req_ui",
    });
  });

  it("formats display text with request id for string-only error surfaces", () => {
    const error = new AppApiError({
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission inventory:write.",
      requestId: "req_forbidden",
      status: 403,
    });

    expect(formatApiErrorDisplay(error, "Fallback")).toBe(
      "Seu usuario nao tem permissao para realizar esta acao. ID do erro: req_forbidden",
    );
  });
});
