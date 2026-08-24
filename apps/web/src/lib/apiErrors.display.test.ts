import { describe, expect, it } from "vitest";
import {
  AppApiError,
  formatApiErrorDisplay,
  getApiErrorDisplay,
  getApiErrorRecovery,
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
      "CRM_WHATSAPP_VALIDATION_ERROR",
      400,
      "A solicitação do atendimento está incompleta ou desatualizada. Atualize as conversas e tente novamente.",
    ],
    [
      "CRM_WHATSAPP_SESSION_REVISION_CONFLICT",
      409,
      "Esta conversa foi alterada em outro atendimento. Atualize as conversas antes de repetir a ação.",
    ],
    [
      "CRM_MESSAGING_PROVIDER_CAPABILITY_UNAVAILABLE",
      409,
      "A conexão atual não oferece esta ação. Verifique a configuração do canal.",
    ],
    [
      "CRM_CONNECTION_SETUP_PAIRING_DISCONNECT_REQUIRED",
      409,
      "Esta instância ainda está conectada a um aparelho. Desconecte o aparelho atual antes de gerar outro QR Code ou código.",
    ],
    [
      "CRM_ZAPI_IDENTITY_REPLACEMENT_REQUIRES_SUPPORT",
      409,
      "O ID informado pertence a outra instância Z-API. Para trocar a instância sem perder o histórico, acione o suporte.",
    ],
    [
      "CRM_ZAPI_CREDENTIAL_VERIFICATION_FAILED",
      502,
      "A Z-API não confirmou as novas credenciais. As credenciais anteriores foram mantidas; confira o ID e o token e tente novamente.",
    ],
    [
      "CRM_WHATSAPP_GATEWAY_ERROR",
      502,
      "A conexão com o WhatsApp falhou temporariamente. Verifique o canal e tente novamente.",
    ],
    [
      "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
      409,
      "Já existe uma conexão para este canal. Abra a conexão existente para revisar a configuração.",
    ],
    [
      "CRM_WHATSAPP_NOT_FOUND",
      404,
      "Esta conversa não está mais disponível. Atualize a lista e selecione outro atendimento.",
    ],
    [
      "CRM_ZAPI_CONNECTION_REPAIR_REQUIRED",
      409,
      "A conexão Z-API foi encontrada. Confirme as novas credenciais da mesma instância para continuar.",
    ],
    [
      "CRM_ZAPI_CONNECTION_REPLACEMENT_REQUIRED",
      409,
      "A conexão Z-API foi encontrada. Confirme a troca para a nova instância para continuar.",
    ],
    [
      "CRM_ZAPI_CREDENTIAL_PARTIAL_STATE",
      409,
      "As credenciais Z-API ficaram incompletas. Abra a conexão existente, use Reparar conexão e informe novamente o ID e o token da mesma instância.",
    ],
    [
      "CRM_PROVIDER_UNAVAILABLE",
      422,
      "Servico temporariamente indisponivel. Tente novamente em instantes.",
    ],
    [
      "FISCAL_ARTIFACT_UNAVAILABLE",
      409,
      "O arquivo fiscal oficial ainda não está disponível. Atualize o status da nota e tente novamente.",
    ],
    [
      "VEHICLE_UNIT_IDENTIFIER_CONFLICT",
      409,
      "Já existe um veículo nesta loja com a mesma placa, estoque ou chassi.",
    ],
    [
      "DOCUMENT_POLICY_ERROR",
      409,
      "O documento não pôde ser vinculado a esta unidade. Atualize a tela e tente novamente.",
    ],
    [
      "INVENTORY_STORAGE_SCOPE_ERROR",
      409,
      "O arquivo não pôde ser vinculado ao veículo. Atualize a tela e tente novamente.",
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

  it.each([
    [
      "zapi",
      "Já existe uma conexão Z-API para esta loja. Abra a conexão existente e use Reparar conexão; nenhuma nova credencial foi salva.",
    ],
    [
      "meta_cloud",
      "Já existe uma conexão oficial para esta loja. Abra a conexão existente para revisar ou reautorizar o canal.",
    ],
    [
      "olx",
      "Já existe uma conexão OLX Chat para esta loja. Abra a conexão existente para revisar a autorização.",
    ],
  ])(
    "uses provider-specific copy for duplicate %s connections",
    (provider, expected) => {
      const error = new AppApiError({
        code: "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
        details: { provider },
        message: "Provider connection already exists.",
        status: 409,
      });

      expect(error.userMessage).toBe(expected);
    },
  );

  it("handles generic and unknown values in display helpers", () => {
    expect(
      getApiErrorDisplay(new Error("Connection failed"), "Fallback"),
    ).toEqual({ message: "Connection failed" });
    expect(
      getApiErrorDisplay(
        new AppApiError({
          message: "Technical API failure",
          status: 422,
        }),
        "Fallback",
      ),
    ).toEqual({ message: "Technical API failure" });
    expect(getApiErrorDisplay({ message: "not trusted" }, "Fallback")).toEqual({
      message: "Fallback",
    });
    expect(formatApiErrorDisplay(null, "Try again")).toBe("Try again");
  });

  it.each([
    ["AUTHORIZATION_DENIED", 403, null],
    ["CRM_WHATSAPP_VALIDATION_ERROR", 400, "refresh"],
    ["CRM_WHATSAPP_SESSION_REVISION_CONFLICT", 409, "refresh"],
    ["CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS", 409, "configure"],
    ["CRM_ZAPI_CREDENTIAL_PARTIAL_STATE", 409, "configure"],
    ["CRM_MESSAGING_PROVIDER_CAPABILITY_UNAVAILABLE", 409, "configure"],
    ["CRM_WHATSAPP_PROVIDER_RATE_LIMITED", 429, "retry"],
    ["INTERNAL_SERVER_ERROR", 500, "retry"],
  ] as const)(
    "classifies recovery for %s without retrying permanent failures",
    (code, status, expected) => {
      const error = new AppApiError({
        code,
        message: "technical message",
        status,
      });

      expect(getApiErrorRecovery(error)?.kind ?? null).toBe(expected);
    },
  );

  it("returns no recovery action for an unclassified API error", () => {
    expect(
      getApiErrorRecovery(
        new AppApiError({ message: "Technical API failure", status: 422 }),
      ),
    ).toBeNull();
  });
});
