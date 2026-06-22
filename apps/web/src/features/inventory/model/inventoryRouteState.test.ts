import { describe, expect, it } from "vitest";
import { readInventoryRouteState } from "./inventoryRouteState";

describe("inventory route state", () => {
  it("reads create visual QA steps from the hash query", () => {
    expect(readInventoryRouteState("#/inventory?view=create&step=media")).toEqual({
      createStep: "media",
      listingId: null,
      screenMode: "create",
    });
  });

  it("reads listing detail visual QA state from the hash query", () => {
    expect(
      readInventoryRouteState(
        "#/inventory?listing=10000000-0000-4000-8000-000000000001",
      ),
    ).toEqual({
      createStep: "mode",
      listingId: "10000000-0000-4000-8000-000000000001",
      screenMode: "list",
    });
  });
});
