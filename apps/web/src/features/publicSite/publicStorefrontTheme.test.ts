import { describe, expect, it } from "vitest";
import { createVisibleSections } from "./publicStorefrontTheme";

describe("createVisibleSections", () => {
  it("keeps a visible hero section first even when persisted after inventory", () => {
    const sections = createVisibleSections(
      [
        { id: "featured", order: 0, type: "featured", visible: true },
        { id: "hero", order: 3, type: "hero", visible: true },
        { id: "contact", order: 4, type: "contact", visible: true },
      ],
      ["featured", "contact"],
    );

    expect(sections.map((section) => section.type)).toEqual([
      "hero",
      "featured",
      "contact",
    ]);
  });

  it("does not restore a hero section when the persisted hero is explicitly hidden", () => {
    const sections = createVisibleSections(
      [
        { id: "featured", order: 0, type: "featured", visible: true },
        { id: "hero", order: 1, type: "hero", visible: false },
      ],
      ["featured"],
    );

    expect(sections.map((section) => section.type)).toEqual(["featured"]);
  });
});
