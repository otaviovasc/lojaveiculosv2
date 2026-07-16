import { describe, expect, it } from "vitest";
import {
  getImageTemplateDownloadBaseName,
  isImageTemplatePhoto,
} from "./ImageTemplateTypes";

describe("ImageTemplateTypes", () => {
  it("keeps only photos in the post workflow", () => {
    expect(isImageTemplatePhoto({ id: "legacy", url: "legacy.jpg" })).toBe(
      true,
    );
    expect(
      isImageTemplatePhoto({ id: "photo", kind: "photo", url: "front.jpg" }),
    ).toBe(true);
    expect(
      isImageTemplatePhoto({ id: "video", kind: "video", url: "walk.mp4" }),
    ).toBe(false);
  });

  it("creates portable download names", () => {
    expect(getImageTemplateDownloadBaseName("Citroën C4 Cactus 2024")).toBe(
      "citroen-c4-cactus-2024",
    );
    expect(getImageTemplateDownloadBaseName("---")).toBe("veiculo");
  });
});
