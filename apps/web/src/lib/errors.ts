const COMMON_ERRORS = {
  NETWORK_ERROR: "Erro de conexão. Verifique sua internet e tente novamente.",
  UNAUTHORIZED: "Você não tem permissão para realizar esta ação.",
  NOT_FOUND: "Recurso não encontrado.",
  SERVER_ERROR:
    "Erro interno do servidor. Tente novamente em alguns instantes.",
  VALIDATION_ERROR: "Dados inválidos. Verifique os campos e tente novamente.",
  UNKNOWN_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
} as const;

export type ErrorCode = keyof typeof COMMON_ERRORS;
export { COMMON_ERRORS };

const UNKNOWN_ERROR_MSG = "Ocorreu um erro inesperado. Tente novamente.";

// Field name mappings for better user-facing messages
const FIELD_NAMES: Record<string, string> = {
  name: "nome",
  email: "e-mail",
  phone: "telefone",
  password: "senha",
  title: "título",
  description: "descrição",
  price: "preço",
  address: "endereço",
  city: "cidade",
  state: "estado",
  zipCode: "CEP",
  document: "documento",
  cnpj: "CNPJ",
  cpf: "CPF",
  workspaceId: "imobiliária",
  userId: "usuário",
  propertyId: "imóvel",
  leadId: "lead",
  status: "status",
  type: "tipo",
  category: "categoria",
  area: "área",
  bedrooms: "quartos",
  bathrooms: "banheiros",
  parking: "vagas",
  url: "URL",
  slug: "slug",
  content: "conteúdo",
  message: "mensagem",
  subject: "assunto",
  template: "modelo",
};

// Format a field name for display
function formatFieldName(field: string): string {
  // Check if we have a mapped name
  if (FIELD_NAMES[field]) {
    return FIELD_NAMES[field];
  }

  // Convert camelCase to readable text
  const readable = field
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  return readable || field;
}

// Parse Zod/validation error message to user-friendly Portuguese
function parseValidationMessage(field: string, error: string): string {
  const fieldName = formatFieldName(field);

  // Required errors
  if (error.includes("Required") || error.includes("required")) {
    return `O campo "${fieldName}" é obrigatório`;
  }

  // String length errors
  const tooShortMatch = error.match(
    /String must contain at least (\d+) character/,
  );
  if (tooShortMatch) {
    const min = tooShortMatch[1];
    return `"${fieldName}" deve ter pelo menos ${min} caracteres`;
  }

  const tooLongMatch = error.match(
    /String must contain at most (\d+) character/,
  );
  if (tooLongMatch) {
    const max = tooLongMatch[1];
    return `"${fieldName}" deve ter no máximo ${max} caracteres`;
  }

  // Number range errors
  const numberTooSmallMatch = error.match(
    /Number must be greater than or equal to (\d+)/,
  );
  if (numberTooSmallMatch) {
    const min = numberTooSmallMatch[1];
    return `"${fieldName}" deve ser maior ou igual a ${min}`;
  }

  const numberTooLargeMatch = error.match(
    /Number must be less than or equal to (\d+)/,
  );
  if (numberTooLargeMatch) {
    const max = numberTooLargeMatch[1];
    return `"${fieldName}" deve ser menor ou igual a ${max}`;
  }

  // Email errors
  if (error.includes("Invalid email") || error.includes("email")) {
    return `"${fieldName}" deve ser um e-mail válido`;
  }

  // URL errors
  if (error.includes("Invalid url") || error.includes("Invalid URL")) {
    return `"${fieldName}" deve ser uma URL válida`;
  }

  // UUID errors
  if (error.includes("Invalid uuid")) {
    return `"${fieldName}" deve ser um identificador válido`;
  }

  // Date errors
  if (error.includes("Invalid date")) {
    return `"${fieldName}" deve ser uma data válida`;
  }

  // Enum errors
  if (error.includes("Invalid enum value")) {
    return `"${fieldName}" possui um valor inválido`;
  }

  // CNPJ/CPF format errors
  if (error.includes("cnpj") || error.includes("CNPJ")) {
    return `"${fieldName}" deve ser um CNPJ válido (formato: 00.000.000/0000-00)`;
  }
  if (error.includes("cpf") || error.includes("CPF")) {
    return `"${fieldName}" deve ser um CPF válido (formato: 000.000.000-00)`;
  }

  // Phone format errors
  if (error.includes("phone") && error.includes("format")) {
    return `"${fieldName}" deve ser um telefone válido (formato: (00) 00000-0000)`;
  }

  // Pattern/regex errors
  if (error.includes("Invalid") && error.includes("format")) {
    return `"${fieldName}" está em formato inválido`;
  }

  // Default: include field name with original error
  return `"${fieldName}": ${error}`;
}

// Type for validation error details
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Format validation errors into user-friendly messages
 * Supports both Zod-style errors and simple string arrays
 */
export function formatValidationErrors(
  errors: Record<string, string[]> | string | undefined,
): string {
  if (!errors) return "Erro ao salvar. Verifique os dados e tente novamente.";
  if (typeof errors === "string") return errors;

  const messages: string[] = [];

  for (const [field, fieldErrors] of Object.entries(errors)) {
    if (!Array.isArray(fieldErrors) || fieldErrors.length === 0) continue;

    // Parse each error message
    for (const error of fieldErrors) {
      messages.push(parseValidationMessage(field, error));
    }
  }

  if (messages.length === 0) {
    return "Erro ao salvar. Verifique os dados e tente novamente.";
  }

  if (messages.length === 1) {
    return messages[0]!;
  }

  // Join multiple errors with proper punctuation
  return messages.join(". ") + ".";
}

/**
 * Get structured validation errors with field and message
 * Useful for displaying errors next to specific form fields
 */
export function getValidationErrors(
  errors: Record<string, string[]> | undefined,
): ValidationErrorDetail[] {
  if (!errors) return [];

  const details: ValidationErrorDetail[] = [];

  for (const [field, fieldErrors] of Object.entries(errors)) {
    if (!Array.isArray(fieldErrors) || fieldErrors.length === 0) continue;

    for (const error of fieldErrors) {
      details.push({
        field,
        message: parseValidationMessage(field, error),
      });
    }
  }

  return details;
}

/**
 * Get the first validation error message for a specific field
 */
export function getFieldError(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  if (!errors || !errors[field]) return undefined;

  const fieldErrors = errors[field];
  if (!Array.isArray(fieldErrors) || fieldErrors.length === 0) return undefined;

  return parseValidationMessage(field, fieldErrors[0]!);
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  if (typeof error === "string") return error;

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  if (fallback) return fallback;
  return UNKNOWN_ERROR_MSG;
}

export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    if ("code" in error) return String(error.code);
    if ("error" in error && typeof error.error === "string") {
      return error.error;
    }
  }
  return undefined;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export function isErrorResponse(error: unknown): error is ErrorResponse {
  return (
    error !== null &&
    typeof error === "object" &&
    "success" in error &&
    error.success === false &&
    "error" in error
  );
}

export function parseServerActionError(error: unknown): {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
} {
  if (isErrorResponse(error)) {
    const res: {
      message: string;
      code?: string;
      details?: Record<string, unknown>;
    } = {
      message: error.error,
    };
    if (error.code !== undefined) {
      res.code = error.code;
    }
    if (error.details !== undefined) {
      res.details = error.details;
    }
    return res;
  }

  if (error && typeof error === "object") {
    if ("message" in error) {
      const code = "code" in error ? String(error.code) : undefined;
      const res: {
        message: string;
        code?: string;
        details?: Record<string, unknown>;
      } = {
        message: String(error.message),
      };
      if (code !== undefined) {
        res.code = code;
      }
      return res;
    }
  }

  return {
    message: UNKNOWN_ERROR_MSG,
  };
}

export function getErrorMessagePt(error: unknown): string {
  const code = getErrorCode(error);

  if (code) {
    switch (code) {
      case "VALIDATION_ERROR":
        return "Dados inválidos. Verifique os campos e tente novamente.";
      case "UNAUTHORIZED":
        return "Você não tem permissão para realizar esta ação.";
      case "NOT_FOUND":
        return "Recurso não encontrado.";
      case "FORBIDDEN":
        return "Acesso negado.";
      case "CONFLICT":
        return "Conflito de dados. Talvez este item já exista.";
      case "RATE_LIMIT":
        return "Muitas tentativas. Aguarde alguns instantes.";
      case "PAYMENT_ERROR":
        return "Erro no pagamento. Verifique seus dados.";
      case "EXTERNAL_SERVICE_ERROR":
        return "Serviço externo indisponível. Tente novamente.";
      default:
        return getErrorMessage(error);
    }
  }

  return getErrorMessage(error);
}
