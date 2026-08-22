import {
  errorResponse,
  externalRuntimeSecurity,
  idempotencyKeyParameter,
  jsonResponse,
  protectedErrorResponses,
  requestBody,
} from "./externalApiOpenApiSupport.js";

const runtimeBase = (summary: string, operationId: string, scope: string) => ({
  tags: ["External API"],
  summary,
  operationId,
  security: externalRuntimeSecurity,
  "x-required-scopes": [scope],
});

export const externalApiCrederePaths = {
  "/api/v1/external-api/financing/credere/preflight": {
    post: {
      ...runtimeBase(
        "Check Credere readiness and missing fields without returning applicant PII",
        "preflightExternalApiCredereSimulation",
        "financing.simulation.read",
      ),
      requestBody: requestBody("CrederePreflightRequest"),
      responses: {
        "200": jsonResponse(
          "Credere preflight envelope.",
          "CrederePreflightResponse",
        ),
        ...protectedErrorResponses,
      },
    },
  },
  "/api/v1/external-api/financing/credere/simulations": {
    post: {
      ...runtimeBase(
        "Create an official consented Credere simulation",
        "createExternalApiCredereSimulation",
        "financing.simulation.create",
      ),
      parameters: [idempotencyKeyParameter],
      requestBody: requestBody("CredereSimulationRequest"),
      "x-idempotency-semantics": "replay-completed-identical-request",
      responses: {
        "202": jsonResponse(
          "Accepted Credere simulation.",
          "CredereSimulationResponse",
        ),
        "409": errorResponse(
          "Idempotency key is in flight or was used with a different validated payload.",
        ),
        ...protectedErrorResponses,
      },
    },
  },
  "/api/v1/external-api/financing/credere/simulations/{inquiryId}": {
    get: {
      ...runtimeBase(
        "Read one official Credere simulation and its bank conditions",
        "getExternalApiCredereSimulation",
        "financing.simulation.read",
      ),
      parameters: [
        {
          in: "path",
          name: "inquiryId",
          required: true,
          schema: { type: "string", minLength: 1, maxLength: 128 },
        },
      ],
      responses: {
        "200": jsonResponse(
          "Credere simulation envelope.",
          "CredereSimulationResponse",
        ),
        "404": errorResponse("Credere simulation not found."),
        ...protectedErrorResponses,
      },
    },
  },
} as const;
