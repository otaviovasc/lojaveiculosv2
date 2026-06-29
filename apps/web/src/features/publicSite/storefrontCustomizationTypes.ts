export type StorefrontCustomizationTab = "design" | "pages";

export type StorefrontCustomizationStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { kind: "saving" };
