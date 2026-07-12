import { describe, expect, it } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { formatCrmSubmitError } from "./CrmFormFeedback";

describe("formatCrmSubmitError", () => {
  it("keeps API request IDs while localizing unknown failures", () => {
    const apiError = new AppApiError({
      message: "technical failure",
      requestId: "request_123",
      status: 503,
      userMessage: "Serviço temporariamente indisponível.",
    });

    expect(formatCrmSubmitError(apiError, "Falha localizada.")).toBe(
      "Serviço temporariamente indisponível. ID do erro: request_123",
    );
    expect(
      formatCrmSubmitError(new Error("internal detail"), "Falha localizada."),
    ).toBe("Falha localizada.");
  });
});
