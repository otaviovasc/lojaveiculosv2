import type { PermissionKey } from "./index.js";

export const externalApiBasePath = "/api/v1/external-api";
export const externalApiContractVersion = "2026-07-11";

export const externalApiAssignableScopes = [
  "crm.access",
  "finance.attach_document",
  "finance.create",
  "finance.read",
  "finance.update",
  "inventory.cost_create",
  "inventory.create",
  "inventory.document_attach",
  "inventory.media_update",
  "inventory.read",
  "inventory.reserve",
  "inventory.sell",
  "inventory.update_description",
  "inventory.update_internal_notes",
  "inventory.update_price",
  "inventory.update_status",
  "inventory.update_unit",
  "lead.create",
  "lead.read",
  "lead.update",
] as const satisfies readonly PermissionKey[];

export type ExternalApiAssignableScope =
  (typeof externalApiAssignableScopes)[number];

export const externalApiRuntimeScopes = [
  {
    description: "Read the clean external vehicle list and vehicle detail.",
    key: "inventory.read",
  },
  {
    description: "Create leads from forms, agents, marketplaces, or chatbots.",
    key: "lead.create",
  },
  {
    description: "Read CRM leads created by any channel.",
    key: "lead.read",
  },
  {
    description: "Update lead status or buyer contact fields.",
    key: "lead.update",
  },
] as const satisfies readonly {
  description: string;
  key: ExternalApiAssignableScope;
}[];

export const externalApiRuntimeOperations = [
  operation(
    "listExternalApiVehicles",
    "GET",
    "/vehicles",
    "inventory.read",
    "List vehicles with pagination and V1-compatible filters.",
  ),
  operation(
    "searchExternalApiVehicles",
    "GET",
    "/vehicles/search",
    "inventory.read",
    "Search vehicles by query, price, year, mileage, color, fuel, and transmission.",
  ),
  operation(
    "getExternalApiVehicle",
    "GET",
    "/vehicles/{listingId}",
    "inventory.read",
    "Read one vehicle detail without tenant, store, VIN, or full plate fields.",
  ),
  operation(
    "listExternalApiLeads",
    "GET",
    "/leads",
    "lead.read",
    "List CRM leads with status, source, phone, listing, and text search filters.",
  ),
  operation(
    "createExternalApiLead",
    "POST",
    "/leads",
    "lead.create",
    "Create a lead from an external site, agent, marketplace, or custom app.",
  ),
  operation(
    "getExternalApiLead",
    "GET",
    "/leads/{leadId}",
    "lead.read",
    "Read one lead detail.",
  ),
  operation(
    "updateExternalApiLead",
    "PATCH",
    "/leads/{leadId}",
    "lead.update",
    "Update lead status and buyer contact fields.",
  ),
] as const;

function operation<
  const OperationId extends string,
  const Method extends "GET" | "PATCH" | "POST",
  const Path extends string,
  const Scope extends ExternalApiAssignableScope,
>(
  operationId: OperationId,
  method: Method,
  path: Path,
  scope: Scope,
  summary: string,
) {
  return {
    method,
    operationId,
    path: `${externalApiBasePath}${path}`,
    scope,
    summary,
  } as const;
}
