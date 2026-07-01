export type ApiErrorPayload = {
  code?: unknown;
  details?: unknown;
  message?: unknown;
  requestId?: unknown;
};

export class AppApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly endpoint?: string;
  readonly requestId?: string;
  readonly status: number;
  readonly technicalMessage: string;
  readonly userMessage: string;

  constructor(input: {
    code?: string;
    details?: unknown;
    endpoint?: string;
    message: string;
    requestId?: string;
    status: number;
    userMessage?: string;
  }) {
    const userMessage = input.userMessage ?? friendlyMessage(input);
    super(userMessage);
    this.name = "AppApiError";
    this.status = input.status;
    this.technicalMessage = input.message;
    this.userMessage = userMessage;
    if (input.code !== undefined) this.code = input.code;
    if (input.details !== undefined) this.details = input.details;
    if (input.endpoint !== undefined) this.endpoint = input.endpoint;
    if (input.requestId !== undefined) this.requestId = input.requestId;
  }
}

export async function readApiJson<T>(
  response: Response,
  options: { endpoint?: string; feature?: string } = {},
): Promise<T> {
  if (!response.ok) {
    throw await createApiError(response, options);
  }

  return (await response.json()) as T;
}

export async function readApiVoid(
  response: Response,
  options: { endpoint?: string; feature?: string } = {},
): Promise<void> {
  if (!response.ok) {
    throw await createApiError(response, options);
  }
}

export function getApiErrorDisplay(error: unknown, fallback: string) {
  if (error instanceof AppApiError) {
    return error.requestId
      ? {
          message: error.userMessage,
          requestId: error.requestId,
        }
      : {
          message: error.userMessage,
        };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: fallback };
}

export function formatApiErrorDisplay(error: unknown, fallback: string) {
  const display = getApiErrorDisplay(error, fallback);
  return display.requestId
    ? `${display.message} ID do erro: ${display.requestId}`
    : display.message;
}

async function createApiError(
  response: Response,
  options: { endpoint?: string; feature?: string },
) {
  const payload = await readErrorPayload(response);
  const requestId =
    readString(payload?.requestId) ??
    response.headers.get("x-request-id") ??
    undefined;
  const code = readString(payload?.code) ?? codeForStatus(response.status);
  const message =
    readString(payload?.message) ??
    `${options.feature ?? "API"} request failed. HTTP ${response.status}.`;

  return new AppApiError({
    code,
    ...(payload?.details !== undefined ? { details: payload.details } : {}),
    ...(options.endpoint ? { endpoint: options.endpoint } : {}),
    message,
    ...(requestId ? { requestId } : {}),
    status: response.status,
  });
}

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  return (await response.json().catch(() => null)) as ApiErrorPayload | null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function codeForStatus(status: number) {
  if (status === 400) return "REQUEST_VALIDATION_ERROR";
  if (status === 401) return "HTTP_AUTHENTICATION_REQUIRED";
  if (status === 403) return "HTTP_AUTHORIZATION_DENIED";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "INTERNAL_SERVER_ERROR";
  return `HTTP_${status}`;
}

function friendlyMessage(input: {
  code?: string;
  message: string;
  status: number;
}) {
  const code = input.code ?? "";

  switch (input.code) {
    case "HTTP_AUTHENTICATION_REQUIRED":
    case "AUTHENTICATION_REQUIRED":
    case "UNAUTHORIZED":
      return "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.";
    case "HTTP_AUTHORIZATION_DENIED":
    case "AUTHORIZATION_DENIED":
    case "FORBIDDEN":
      return "Seu usuario nao tem permissao para realizar esta acao.";
    case "REQUEST_VALIDATION_ERROR":
    case "VEHICLE_VALIDATION_ERROR":
      return "Revise os campos informados e tente novamente.";
    case "INVENTORY_ENRICHMENT_PROVIDER_ERROR":
      return "Nao foi possivel consultar o servico de enriquecimento agora. Tente novamente em instantes.";
    case "RATE_LIMIT":
    case "PUBLIC_LEAD_RATE_LIMITED":
      return "Muitas tentativas em sequencia. Aguarde um instante e tente novamente.";
    case "INTERNAL_SERVER_ERROR":
      return "Erro interno do servidor. Tente novamente em instantes.";
    default:
      if (
        code.endsWith("_REQUEST_VALIDATION_ERROR") ||
        code.endsWith("_VALIDATION_ERROR") ||
        code.includes("VALIDATION")
      ) {
        return "Revise os campos informados e tente novamente.";
      }
      if (
        code.endsWith("_PROVIDER_UNAVAILABLE") ||
        code.endsWith("_PROVIDER_ERROR") ||
        code.endsWith("_UNAVAILABLE")
      ) {
        return "Servico temporariamente indisponivel. Tente novamente em instantes.";
      }
      if (code.endsWith("_NOT_FOUND") || input.status === 404) {
        return "Nao encontramos esse registro. Atualize a tela e tente novamente.";
      }
      if (code.endsWith("_CONFLICT") || input.status === 409) {
        return "Nao foi possivel concluir porque os dados mudaram. Atualize e tente novamente.";
      }
      if (code.endsWith("_RATE_LIMITED") || input.status === 429) {
        return "Muitas tentativas em sequencia. Aguarde um instante e tente novamente.";
      }
      if (input.status === 401) {
        return "Sua sessao ou loja ativa nao foi identificada. Entre novamente ou selecione a loja.";
      }
      if (input.status === 403) {
        return "Seu usuario nao tem permissao para realizar esta acao.";
      }
      if (input.status >= 500) {
        return "Erro interno do servidor. Tente novamente em instantes.";
      }
      return input.message;
  }
}
