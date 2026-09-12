import { describe, expect, it } from "vitest";
import { storefrontSchemas } from "./storefrontOpenApiSchemas.js";

describe("public storefront OpenAPI schemas", () => {
  it("documents the public profile address and business hours contract", () => {
    const contact = storefrontSchemas.PublicStorefrontContact;

    expect(contact.required).toEqual(
      expect.arrayContaining([
        "addressCity",
        "addressLine1",
        "addressLine2",
        "addressState",
        "addressZipCode",
        "businessHours",
      ]),
    );
    expect(contact.properties).not.toHaveProperty("documentNumber");
  });
});
