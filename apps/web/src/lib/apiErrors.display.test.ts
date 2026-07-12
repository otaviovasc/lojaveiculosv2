import { describe, expect, it } from "vitest";
import {
  AppApiError,
  formatApiErrorDisplay,
  getApiErrorDisplay,
} from "./apiErrors";

describe("API error display helpers", () => {
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

  it.each([
    [
      "AUTHENTICATION_REQUIRED",
      422,
      "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.",
    ],
    [
      "VEHICLE_VALIDATION_ERROR",
      422,
      "Revise os campos informados e tente novamente.",
    ],
    [
      "INVENTORY_ENRICHMENT_PROVIDER_ERROR",
      422,
      "Nao foi possivel consultar o servico de enriquecimento agora. Tente novamente em instantes.",
    ],
    [
      "PUBLIC_LEAD_RATE_LIMITED",
      422,
      "Muitas tentativas em sequencia. Aguarde um instante e tente novamente.",
    ],
    [
      "CRM_REQUEST_VALIDATION_ERROR",
      422,
      "Revise os campos informados e tente novamente.",
    ],
    [
      "CRM_PROVIDER_UNAVAILABLE",
      422,
      "Servico temporariamente indisponivel. Tente novamente em instantes.",
    ],
    [
      "CRM_LEAD_NOT_FOUND",
      422,
      "Nao encontramos esse registro. Atualize a tela e tente novamente.",
    ],
    [
      "CRM_VERSION_CONFLICT",
      422,
      "Nao foi possivel concluir porque os dados mudaram. Atualize e tente novamente.",
    ],
    [
      "CRM_RATE_LIMITED",
      422,
      "Muitas tentativas em sequencia. Aguarde um instante e tente novamente.",
    ],
    [
      undefined,
      401,
      "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.",
    ],
    [undefined, 403, "Seu usuario nao tem permissao para realizar esta acao."],
    [
      "UNKNOWN_CODE",
      500,
      "Erro interno do servidor. Tente novamente em instantes.",
    ],
    ["UNKNOWN_CODE", 422, "Technical message"],
  ])("maps %s at HTTP %i to safe UI copy", (code, status, expected) => {
    const error = new AppApiError({
      ...(code === undefined ? {} : { code }),
      message: "Technical message",
      status,
    });

    expect(error.message).toBe(expected);
    expect(error.userMessage).toBe(expected);
  });

  it("handles generic and unknown values in display helpers", () => {
    expect(
      getApiErrorDisplay(new Error("Connection failed"), "Fallback"),
    ).toEqual({ message: "Connection failed" });
    expect(getApiErrorDisplay({ message: "not trusted" }, "Fallback")).toEqual({
      message: "Fallback",
    });
    expect(formatApiErrorDisplay(null, "Try again")).toBe("Try again");
  });
});
