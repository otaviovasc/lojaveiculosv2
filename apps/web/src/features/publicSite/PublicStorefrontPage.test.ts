import { describe, expect, it } from "vitest";
import { setListingParam } from "./PublicStorefrontPage";

describe("PublicStorefrontPage route params", () => {
  it("sets and clears the listing query parameter without dropping other params", () => {
    const params = new URLSearchParams("editor=1&listing=old-slug");

    expect(setListingParam(params, "fiat-toro").toString()).toBe(
      "editor=1&listing=fiat-toro",
    );
    expect(setListingParam(params, null).toString()).toBe("editor=1");
  });
});
