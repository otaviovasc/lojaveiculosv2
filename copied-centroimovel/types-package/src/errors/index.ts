/**
 * Standardized error hierarchy for CentroImovel
 *
 * All errors in the application should extend DomainError.
 * This ensures consistent error handling across the API.
 *
 * @example
 * ```typescript
 * // Throwing errors
 * throw new NotFoundError("Property", "prop_123");
 * throw new ValidationError("Invalid price", { field: "price" });
 *
 * // Handling errors in server actions
 * try {
 *   await someOperation();
 * } catch (error) {
 *   if (error instanceof NotFoundError) {
 *     return { success: false, error: error.message, code: error.code };
 *   }
 * }
 * ```
 */

/**
 * Base error class for all domain errors.
 * Provides consistent structure for error handling across the application.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Error thrown when validation fails
 * Status code: 400
 */
export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

/**
 * Error thrown when a resource is not found
 * Status code: 404
 */
export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, "NOT_FOUND", 404, {
      resource,
      id,
    });
  }
}

/**
 * Error thrown when there's a conflict (e.g., duplicate resource)
 * Status code: 409
 */
export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFLICT", 409, details);
  }
}

/**
 * Error thrown when user is not authenticated
 * Status code: 401
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

/**
 * Error thrown when user is authenticated but lacks permission
 * Status code: 403
 */
export class ForbiddenError extends DomainError {
  constructor(message: string = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

/**
 * Error thrown when a payment fails
 * Status code: 402
 */
export class PaymentError extends DomainError {
  constructor(
    message: string,
    public readonly paymentCode?: string,
  ) {
    super(
      message,
      "PAYMENT_ERROR",
      402,
      paymentCode ? { paymentCode } : undefined,
    );
  }
}

/**
 * Error thrown when rate limit is exceeded
 * Status code: 429
 */
export class RateLimitError extends DomainError {
  constructor(
    message: string = "Rate limit exceeded",
    public readonly retryAfter?: number,
  ) {
    super(message, "RATE_LIMIT", 429, retryAfter ? { retryAfter } : undefined);
  }
}

/**
 * Error thrown when an external service fails
 * Status code: 502
 */
export class ExternalServiceError extends DomainError {
  constructor(
    message: string,
    public readonly service: string,
  ) {
    super(message, "EXTERNAL_SERVICE_ERROR", 502, { service });
  }
}

/**
 * Type guard to check if an error is a DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Helper to convert any error to a standardized error response
 */
export function toErrorResponse(error: unknown): {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
} {
  if (isDomainError(error)) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...(error.details ? { details: error.details } : {}),
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }

  return {
    success: false,
    error: "An unknown error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}

/**
 * Standard success response type
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard error response type
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
