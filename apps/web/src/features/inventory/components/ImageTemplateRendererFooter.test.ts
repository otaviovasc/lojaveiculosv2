import { afterEach, describe, expect, it, vi } from "vitest";
import { drawContactFooter } from "./ImageTemplateRendererFooter";
import type { ImageTemplatePreset } from "./ImageTemplateTypes";

afterEach(() => vi.unstubAllGlobals());

describe("drawContactFooter", () => {
  it("draws the WhatsApp glyph with the configured footer text color", () => {
    let fillStyle: string | CanvasGradient | CanvasPattern = "black";
    const glyphFillColors: Array<string | CanvasGradient | CanvasPattern> = [];
    const context = {
      fill: vi.fn(() => glyphFillColors.push(fillStyle)),
      fillText: vi.fn(),
      font: "",
      get fillStyle() {
        return fillStyle;
      },
      measureText: vi.fn(() => ({ width: 120 })),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      set fillStyle(value: string | CanvasGradient | CanvasPattern) {
        fillStyle = value;
      },
      strokeStyle: "black",
      textAlign: "start",
      textBaseline: "alphabetic",
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    class TestPath2D {
      readonly path: string;

      constructor(path = "") {
        this.path = path;
      }
    }
    vi.stubGlobal("Path2D", TestPath2D);

    drawContactFooter(
      context,
      preset,
      "feed",
      1_080,
      { profile: { whatsappPhone: "11999999999" } },
      "white",
    );

    expect(glyphFillColors).toEqual(["white"]);
  });
});

const preset: ImageTemplatePreset = {
  bgBlurAmount: 0,
  bgStyle: "solid",
  blurBrightness: 1,
  cardYOffset: 0,
  color: "black",
  contactSizeScale: 1,
  cropXOffset: 0,
  cropYOffset: 0,
  customTextColor: "white",
  fontFamily: "Inter",
  fontSizeScale: 1,
  footerYOffset: 0,
  format: "feed",
  glassBlur: 0,
  glassOpacity: 0,
  imageHeightScale: 1,
  imageWidthScale: 1,
  imageXOffset: 0,
  imageYOffset: 0,
  logoScale: 1,
  name: "Teste",
  priceColor: "white",
  showContactSection: true,
  showGlassBox: false,
  showInstagram: false,
  showPhones: true,
  showPrice: false,
  showVehicleDetails: false,
  showWebsite: false,
};
