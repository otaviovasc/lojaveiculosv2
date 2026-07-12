export type PublicApiAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

import type { ExternalApiAssignableScope } from "@lojaveiculosv2/shared";

export type PublicApiScope = ExternalApiAssignableScope;

export type PublicApiClientStatus = "active" | "revoked" | "suspended";

export type PublicApiClient = {
  createdAt: string;
  id: string;
  keyPrefixes: string[];
  name: string;
  scopes: PublicApiScope[];
  status: PublicApiClientStatus;
  storeId: string;
  tenantId: string;
  updatedAt: string;
};

export type CreatedPublicApiClient = {
  apiKey: string;
  client: PublicApiClient;
};

export type CreatePublicApiClientInput = {
  name: string;
  scopes: PublicApiScope[];
};

export type PublicApiStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { kind: "saving" };
