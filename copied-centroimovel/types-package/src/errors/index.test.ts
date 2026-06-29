import { describe, it, expect } from "vitest";
import {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  PaymentError,
  RateLimitError,
  ExternalServiceError,
  isDomainError,
  toErrorResponse,
} from "./index";

describe("DomainError", () => {
  it("should create a domain error with default status code", () => {
    const error = new DomainError("Something went wrong", "CUSTOM_ERROR");

    expect(error.message).toBe("Something went wrong");
    expect(error.code).toBe("CUSTOM_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe("DomainError");
  });

  it("should create a domain error with custom status code and details", () => {
    const details = { field: "email", value: "invalid" };
    const error = new DomainError(
      "Invalid email",
      "INVALID_EMAIL",
      400,
      details,
    );

    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });

  it("should serialize to JSON correctly", () => {
    const details = { field: "name" };
    const error = new DomainError("Invalid name", "INVALID_NAME", 400, details);

    const json = error.toJSON();
    expect(json).toEqual({
      name: "DomainError",
      message: "Invalid name",
      code: "INVALID_NAME",
      statusCode: 400,
      details: { field: "name" },
    });
  });
});

describe("ValidationError", () => {
  it("should create a validation error", () => {
    const error = new ValidationError("Email is required");

    expect(error.message).toBe("Email is required");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(400);
  });

  it("should create a validation error with details", () => {
    const details = { field: "email", constraint: "required" };
    const error = new ValidationError("Email is required", details);

    expect(error.details).toEqual(details);
  });
});

describe("NotFoundError", () => {
  it("should create a not found error", () => {
    const error = new NotFoundError("Property", "prop_123");

    expect(error.message).toBe("Property with id 'prop_123' not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ resource: "Property", id: "prop_123" });
  });
});

describe("ConflictError", () => {
  it("should create a conflict error", () => {
    const error = new ConflictError("Email already exists");

    expect(error.message).toBe("Email already exists");
    expect(error.code).toBe("CONFLICT");
    expect(error.statusCode).toBe(409);
  });
});

describe("UnauthorizedError", () => {
  it("should create an unauthorized error with default message", () => {
    const error = new UnauthorizedError();

    expect(error.message).toBe("Unauthorized");
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.statusCode).toBe(401);
  });

  it("should create an unauthorized error with custom message", () => {
    const error = new UnauthorizedError("Invalid credentials");

    expect(error.message).toBe("Invalid credentials");
  });
});

describe("ForbiddenError", () => {
  it("should create a forbidden error with default message", () => {
    const error = new ForbiddenError();

    expect(error.message).toBe("Forbidden");
    expect(error.code).toBe("FORBIDDEN");
    expect(error.statusCode).toBe(403);
  });
});

describe("PaymentError", () => {
  it("should create a payment error", () => {
    const error = new PaymentError("Card declined", "card_declined");

    expect(error.message).toBe("Card declined");
    expect(error.code).toBe("PAYMENT_ERROR");
    expect(error.statusCode).toBe(402);
    expect(error.paymentCode).toBe("card_declined");
    expect(error.details).toEqual({ paymentCode: "card_declined" });
  });

  it("should create a payment error without payment code", () => {
    const error = new PaymentError("Payment failed");

    expect(error.paymentCode).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});

describe("RateLimitError", () => {
  it("should create a rate limit error with default message", () => {
    const error = new RateLimitError();

    expect(error.message).toBe("Rate limit exceeded");
    expect(error.code).toBe("RATE_LIMIT");
    expect(error.statusCode).toBe(429);
  });

  it("should create a rate limit error with retry after", () => {
    const error = new RateLimitError("Too many requests", 60);

    expect(error.retryAfter).toBe(60);
    expect(error.details).toEqual({ retryAfter: 60 });
  });
});

describe("ExternalServiceError", () => {
  it("should create an external service error", () => {
    const error = new ExternalServiceError("Payment gateway timeout", "asaas");

    expect(error.message).toBe("Payment gateway timeout");
    expect(error.code).toBe("EXTERNAL_SERVICE_ERROR");
    expect(error.statusCode).toBe(502);
    expect(error.service).toBe("asaas");
    expect(error.details).toEqual({ service: "asaas" });
  });
});

describe("isDomainError", () => {
  it("should return true for DomainError instances", () => {
    const error = new ValidationError("Invalid input");
    expect(isDomainError(error)).toBe(true);
  });

  it("should return true for subclasses of DomainError", () => {
    const error = new NotFoundError("User", "123");
    expect(isDomainError(error)).toBe(true);
  });

  it("should return false for regular Error", () => {
    const error = new Error("Regular error");
    expect(isDomainError(error)).toBe(false);
  });

  it("should return false for non-error values", () => {
    expect(isDomainError("string")).toBe(false);
    expect(isDomainError(null)).toBe(false);
    expect(isDomainError(undefined)).toBe(false);
    expect(isDomainError({})).toBe(false);
  });
});

describe("toErrorResponse", () => {
  it("should convert DomainError to error response", () => {
    const error = new ValidationError("Invalid email", { field: "email" });
    const response = toErrorResponse(error);

    expect(response).toEqual({
      success: false,
      error: "Invalid email",
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details: { field: "email" },
    });
  });

  it("should convert regular Error to error response", () => {
    const error = new Error("Something broke");
    const response = toErrorResponse(error);

    expect(response).toEqual({
      success: false,
      error: "Something broke",
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  });

  it("should convert unknown error to error response", () => {
    const response = toErrorResponse("string error");

    expect(response).toEqual({
      success: false,
      error: "An unknown error occurred",
      code: "UNKNOWN_ERROR",
      statusCode: 500,
    });
  });
});
