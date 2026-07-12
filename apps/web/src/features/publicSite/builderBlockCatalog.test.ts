import { describe, expect, it } from "vitest";
import { createDefaultPageComponent } from "./builderBlockCatalog";
import {
  pageBuilderDefaultGalleryImages,
  pageBuilderDefaultMedia,
} from "./pageBuilderDefaultMedia";

describe("builder block catalog", () => {
  it("creates image-led blocks with usable automotive media defaults", () => {
    expect(createDefaultPageComponent("hero", 0).props.imageUrl).toBe(
      pageBuilderDefaultMedia.audiFront,
    );
    expect(createDefaultPageComponent("image", 1).props.imageUrl).toBe(
      pageBuilderDefaultMedia.audiSide,
    );
    expect(createDefaultPageComponent("scroll_zoom", 2).props.imageUrl).toBe(
      pageBuilderDefaultMedia.bmwFront,
    );
    expect(createDefaultPageComponent("gallery", 3).props.images).toEqual(
      pageBuilderDefaultGalleryImages,
    );
  });

  it("keeps layout blocks structurally empty for user composition", () => {
    expect(createDefaultPageComponent("container", 0).props.children).toEqual(
      [],
    );
    expect(
      createDefaultPageComponent("two_column", 1).props.leftChildren,
    ).toEqual([]);
    expect(
      createDefaultPageComponent("two_column", 1).props.rightChildren,
    ).toEqual([]);
  });
});
