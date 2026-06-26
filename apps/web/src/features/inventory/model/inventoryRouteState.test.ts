import { describe, expect, it } from "vitest";
import {
  inventoryCreateHash,
  inventoryListHash,
  readInventoryRouteState,
} from "./inventoryRouteState";

describe("inventory route state", () => {
  it("reads create visual QA steps from the hash query", () => {
    expect(
      readInventoryRouteState("#/inventory?view=create&step=media"),
    ).toEqual({
      createStep: "media",
      listingId: null,
      screenMode: "create",
      unitId: null,
    });
  });

  it("reads the dedicated vehicle creation hash path", () => {
    expect(readInventoryRouteState("#/inventory/create/catalog")).toEqual({
      createStep: "catalog",
      listingId: null,
      screenMode: "create",
      unitId: null,
    });
  });

  it("reads listing detail visual QA state from the hash query", () => {
    expect(
      readInventoryRouteState(
        "#/inventory?listing=10000000-0000-4000-8000-000000000001&unit=11000000-0000-4000-8000-000000000005",
      ),
    ).toEqual({
      createStep: "mode",
      listingId: "10000000-0000-4000-8000-000000000001",
      screenMode: "list",
      unitId: "11000000-0000-4000-8000-000000000005",
    });
  });

  it("builds stable inventory list and creation hashes", () => {
    expect(inventoryListHash()).toBe("/inventory");
    expect(inventoryCreateHash()).toBe("/inventory/create");
    expect(inventoryCreateHash("media")).toBe("/inventory/create/media");
  });
});
