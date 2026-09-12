const bearerSecurity = [{ bearerAuth: [] }];
const storeMappingBody = {
  required: true,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/CredereStoreMappingRequest" },
    },
  },
} as const;

export const financingConnectionPaths = {
  "/api/v1/agency/tenants/{tenantId}/financing/credere": {
    get: operation(
      "getAgencyCredereConnection",
      "Read agency Credere connection and local store mappings.",
      "Agency connection and local mappings.",
    ),
  },
  "/api/v1/agency/tenants/{tenantId}/financing/credere/oauth/start": {
    post: operation(
      "startAgencyCredereOAuth",
      "Start agency-scoped Credere OAuth.",
      "Authorization URL and opaque state.",
      "201",
    ),
  },
  "/api/v1/agency/tenants/{tenantId}/financing/credere/provider-stores": {
    get: operation(
      "listAgencyCredereProviderStores",
      "List Credere provider stores for agency mapping.",
      "Provider stores.",
    ),
  },
  "/api/v1/agency/tenants/{tenantId}/financing/credere/store-mappings/{storeId}":
    {
      put: {
        ...operation(
          "upsertAgencyCredereStoreMapping",
          "Map a V2 store to a Credere store.",
          "Updated local mapping.",
        ),
        requestBody: storeMappingBody,
      },
      delete: operation(
        "deleteAgencyCredereStoreMapping",
        "Delete a local Credere store mapping.",
        "Mapping deletion result.",
      ),
    },
  "/api/v1/agency/tenants/{tenantId}/financing/credere/connection": {
    delete: operation(
      "deleteAgencyCredereConnection",
      "Disconnect agency Credere integration.",
      "Connection deletion result.",
    ),
  },
  "/api/v1/financing/credere/oauth/callback": {
    get: {
      tags: ["Financing"],
      summary: "Complete Credere OAuth callback from opaque server state.",
      operationId: "completeCredereOAuthCallback",
      responses: responses("Safe test JSON or redirect."),
    },
  },
  "/api/v1/financing/credere/connection": {
    get: operation(
      "getDirectOwnerCredereConnection",
      "Read the current direct owner's Credere connection and store mapping.",
      "Direct-owner connection and current-store mapping.",
    ),
    delete: operation(
      "deleteDirectOwnerCredereConnection",
      "Disconnect the current direct owner's Credere account.",
      "Connection deletion result.",
    ),
  },
  "/api/v1/financing/credere/oauth/start": {
    post: operation(
      "startDirectOwnerCredereOAuth",
      "Start Credere OAuth for the current direct-owned store.",
      "Authorization URL and opaque state.",
      "201",
    ),
  },
  "/api/v1/financing/credere/provider-stores": {
    get: operation(
      "listDirectOwnerCredereProviderStores",
      "List Credere stores for the authenticated direct owner's account.",
      "Provider stores.",
    ),
  },
  "/api/v1/financing/credere/store-mapping": {
    put: {
      ...operation(
        "upsertDirectOwnerCredereStoreMapping",
        "Map the current direct-owned store to a Credere store.",
        "Updated current-store mapping.",
      ),
      requestBody: storeMappingBody,
    },
    delete: operation(
      "deleteDirectOwnerCredereStoreMapping",
      "Delete the current direct-owned store's Credere mapping.",
      "Mapping deletion result.",
    ),
  },
} as const;

function operation(
  operationId: string,
  summary: string,
  description: string,
  status = "200",
) {
  return {
    tags: ["Financing"],
    summary,
    operationId,
    security: bearerSecurity,
    responses: responses(description, status),
  };
}

function responses(description: string, status = "200") {
  return {
    [status]: { description },
    "400": { description: "Invalid request." },
    "401": { description: "Authentication required." },
    "403": { description: "Authorization or entitlement denied." },
    "409": { description: "Conflict." },
    "422": { description: "Provider/domain validation failed." },
    "429": { description: "Provider rate limited the request." },
    "503": { description: "Credere financing unavailable." },
  };
}
