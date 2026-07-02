export type StorefrontImageAspect =
  "banner" | "original" | "portrait" | "square" | "wide";

export type StorefrontImageEditorSettings = {
  aspect: StorefrontImageAspect;
  blur: number;
  brightness: number;
  contrast: number;
  removeColor: string;
  removeColorEnabled: boolean;
  removeTolerance: number;
  saturation: number;
  x: number;
  y: number;
  zoom: number;
};

export const defaultImageEditorSettings: StorefrontImageEditorSettings = {
  aspect: "wide",
  blur: 0,
  brightness: 1,
  contrast: 1,
  removeColor: toHexColor(255, 255, 255),
  removeColorEnabled: false,
  removeTolerance: 22,
  saturation: 1,
  x: 0,
  y: 0,
  zoom: 1,
};

export const imageAspectOptions = [
  { label: "Wide", value: "wide" },
  { label: "Quadrada", value: "square" },
  { label: "Retrato", value: "portrait" },
  { label: "Banner", value: "banner" },
  { label: "Original", value: "original" },
] as const;

export function createEditedImageFileName(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "") || "imagem";
  return `${stem}-galeria.png`;
}

export function toHexColor(red: number, green: number, blue: number) {
  return [
    "#",
    [red, green, blue]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(""),
  ].join("");
}
