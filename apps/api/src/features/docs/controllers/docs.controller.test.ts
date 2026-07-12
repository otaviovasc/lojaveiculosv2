import { describe, expect, it } from "vitest";
import { createApp } from "../../../infrastructure/http/createApp.js";
import { llmsText, openApiDocument } from "./docs.controller.js";
import {
  externalApiDocsMarkdown,
  externalApiLlmsText,
  externalApiOpenApiDocument,
} from "./externalApiDocs.js";

describe("API docs routes", () => {
  it("serves deterministic llms.txt metadata", async () => {
    const app = createApp();

    const response = await app.request("/llms.txt");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe(llmsText);
  });

  it("serves deterministic OpenAPI metadata", async () => {
    const app = createApp();

    const response = await app.request("/api/v1/openapi.json");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(openApiDocument);
  });

  it("serves unique AI-native Public API docs routes", async () => {
    const app = createApp();

    const [docsResponse, markdownResponse, llmsResponse, openApiResponse] =
      await Promise.all([
        app.request("/api/v1/external-api/docs"),
        app.request("/api/v1/external-api/docs.md"),
        app.request("/api/v1/external-api/llms.txt"),
        app.request("/api/v1/external-api/openapi.json"),
      ]);

    expect(docsResponse.status).toBe(200);
    expect(docsResponse.headers.get("content-type")).toContain("text/markdown");
    expect(await docsResponse.text()).toBe(externalApiDocsMarkdown);
    expect(markdownResponse.status).toBe(200);
    expect(await markdownResponse.text()).toBe(externalApiDocsMarkdown);
    expect(llmsResponse.status).toBe(200);
    expect(llmsResponse.headers.get("content-type")).toContain("text/plain");
    expect(await llmsResponse.text()).toBe(externalApiLlmsText);
    expect(await openApiResponse.json()).toEqual(externalApiOpenApiDocument);
  });

  it("keeps the Public API llms.txt index concise and spec-shaped", () => {
    expect(externalApiLlmsText).toMatch(/^# Loja Veiculos Public API\n\n>/);
    expect(externalApiLlmsText).toContain("## Canonical Documentation");
    expect(externalApiLlmsText).toContain("## Optional");
    expect(externalApiLlmsText).toContain(
      "- [Public API OpenAPI](/api/v1/external-api/openapi.json):",
    );
  });

  it("documents current inventory auth and external API limits", () => {
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}"].get
        .security,
    ).toEqual([{ bearerAuth: ["inventory.read"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}"].delete
        .security,
    ).toEqual([{ bearerAuth: ["inventory.delete"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings"].get.security,
    ).toEqual([{ bearerAuth: ["inventory.read"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/price"]
        .patch.security,
    ).toEqual([{ bearerAuth: ["inventory.update_price"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/listings/{listingId}/status"]
        .patch.security,
    ).toEqual([{ bearerAuth: ["inventory.update_status"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/media/uploads"]
        .post.security,
    ).toEqual([{ bearerAuth: ["inventory.create"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/costs"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.cost_create"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/suppliers"].post.security,
    ).toEqual([{ bearerAuth: ["inventory.update_unit"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/acquisition"].put
        .requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/UpsertVehicleUnitAcquisitionRequest",
    });
    expect(
      openApiDocument.paths["/api/v1/finance/entries"].post.security,
    ).toEqual([{ bearerAuth: ["finance.create"] }]);
    expect(
      openApiDocument.paths["/api/v1/finance/entries/{entryId}"].get.security,
    ).toEqual([{ bearerAuth: ["finance.read"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/finance/entries/{entryId}/documents/uploads"
      ].post.security,
    ).toEqual([{ bearerAuth: ["finance.attach_document"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/reserve"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.reserve"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/sell"].post
        .security,
    ).toEqual([{ bearerAuth: ["inventory.sell"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/media/{mediaId}"]
        .patch.security,
    ).toEqual([{ bearerAuth: ["inventory.media_update"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/media/{mediaId}"]
        .delete.security,
    ).toEqual([{ bearerAuth: ["inventory.media_delete"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/units/{unitId}/reservation/release"
      ].post.security,
    ).toEqual([{ bearerAuth: ["inventory.reserve"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/units/{unitId}/reservation/cancel"
      ].post.security,
    ).toEqual([{ bearerAuth: ["inventory.reserve"] }]);
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/units/{unitId}/reservation/expire"
      ].post.security,
    ).toEqual([{ bearerAuth: ["inventory.reserve"] }]);
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/reserve"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/ReserveVehicleUnitRequest" });
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/sell"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/SellVehicleUnitRequest" });
    expect(
      openApiDocument.paths[
        "/api/v1/inventory/units/{unitId}/reservation/cancel"
      ].post.requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/ReleaseVehicleUnitReservationRequest",
    });
    const paths = openApiDocument.paths as Record<string, unknown>;
    expect(
      paths["/api/v1/inventory/listings/{listingId}/reserve"],
    ).toBeUndefined();
    expect(
      paths["/api/v1/inventory/listings/{listingId}/sell"],
    ).toBeUndefined();
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/costs"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/CreateVehicleCostRequest" });
    expect(
      openApiDocument.paths["/api/v1/inventory/units/{unitId}/checklists"].post
        .requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/CreateVehicleChecklistRequest" });
    expect(openApiDocument.components.schemas.VehicleMediaUpload).toEqual(
      expect.objectContaining({
        required: [
          "expiresAt",
          "publicUrl",
          "storageKey",
          "uploadHeaders",
          "uploadMethod",
          "uploadUrl",
        ],
      }),
    );
    expect(openApiDocument.components.schemas.InventoryListingDetail).toEqual(
      expect.objectContaining({
        required: [
          "checklists",
          "documents",
          "listing",
          "media",
          "status",
          "units",
        ],
      }),
    );
    expect(
      openApiDocument.components.schemas.VehicleChecklistStatus.enum,
    ).toEqual(["failed", "in_progress", "passed", "pending", "waived"]);
    expect(openApiDocument.components.schemas.VehicleDocumentKind.enum).toEqual(
      expect.arrayContaining([
        "reservation_receipt",
        "sale_contract",
        "sale_receipt",
        "delivery_term",
        "power_of_attorney",
      ]),
    );
    expect(
      openApiDocument.components.schemas.CreateFinanceEntryRequest.properties
        .documentUpload,
    ).toEqual({
      $ref: "#/components/schemas/CreateFinanceEntryDocumentUploadRequest",
    });
    expect(
      openApiDocument.components.schemas.FinanceEntryDetail.required,
    ).toEqual(["entry", "links", "documents"]);
    expect(openApiDocument["x-scopes"]["inventory.read"]).toContain(
      "Read vehicle inventory",
    );
    expect(openApiDocument["x-scopes"]["finance.attach_document"]).toContain(
      "attach documents",
    );
    expect(openApiDocument["x-finance-side-effects"].linkTargets).toEqual(
      expect.arrayContaining(["sale", "sale_payment", "vehicle_cost"]),
    );
    expect(openApiDocument["x-external-api-safety-limits"]).toContain(
      "Tenant and store scoping required for every external request.",
    );
    expect(
      openApiDocument.paths["/api/v1/external-api/vehicles"].get.security,
    ).toEqual([{ externalApiKey: [] }, { externalApiBearer: [] }]);
    expect(
      openApiDocument.paths["/api/v1/external-api/vehicles"].get[
        "x-required-scopes"
      ],
    ).toEqual(["inventory.read"]);
    expect(
      openApiDocument.paths["/api/v1/external-api/leads"].post.security,
    ).toEqual([{ externalApiKey: [] }, { externalApiBearer: [] }]);
    expect(
      openApiDocument.paths["/api/v1/external-api/leads"].post[
        "x-required-scopes"
      ],
    ).toEqual(["lead.create"]);
  });
});
