export type PublicApiAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type PublicApiScope =
  | "crm.access"
  | "finance.attach_document"
  | "finance.create"
  | "finance.read"
  | "finance.update"
  | "inventory.cost_create"
  | "inventory.create"
  | "inventory.document_attach"
  | "inventory.media_update"
  | "inventory.read"
  | "inventory.reserve"
  | "inventory.sell"
  | "inventory.update_description"
  | "inventory.update_internal_notes"
  | "inventory.update_price"
  | "inventory.update_status"
  | "inventory.update_unit"
  | "lead.create"
  | "lead.read"
  | "lead.update";

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
