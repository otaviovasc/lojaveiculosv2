import { PaperTexture } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

const PAGE_TEXTURE_COLOR_TOKEN = "--color-line-strong";
const SIDEBAR_TEXTURE_COLOR_TOKEN = "--color-sidebar-line";
const TRANSPARENT_COLOR_TOKEN = "--color-transparent";

function readTextureColors(frontColorToken: string) {
  if (typeof window === "undefined") return { back: "", front: "" };
  const rootStyles = window.getComputedStyle(document.documentElement);
  return {
    back: rootStyles.getPropertyValue(TRANSPARENT_COLOR_TOKEN).trim(),
    front: rootStyles.getPropertyValue(frontColorToken).trim(),
  };
}

function supportsWebGl2() {
  if (
    typeof window === "undefined" ||
    typeof window.WebGL2RenderingContext === "undefined"
  ) {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        failIfMajorPerformanceCaveat: true,
        powerPreference: "low-power",
        preserveDrawingBuffer: false,
        stencil: false,
      }),
    );
  } catch {
    return false;
  }
}

type TextureLayerProps = {
  className: string;
  colorToken: string;
  crumples: number;
  fade: number;
  fiber: number;
  folds: number;
  roughness: number;
};

function TextureLayer({
  className,
  colorToken,
  crumples,
  fade,
  fiber,
  folds,
  roughness,
}: TextureLayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [textureColors, setTextureColors] = useState({ back: "", front: "" });

  useEffect(() => {
    const syncTextureColor = () =>
      setTextureColors(readTextureColors(colorToken));
    syncTextureColor();
    setIsReady(supportsWebGl2());

    const observer = new MutationObserver(syncTextureColor);
    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme", "style"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, [colorToken]);

  return (
    <div aria-hidden="true" className={className}>
      {isReady && textureColors.front && textureColors.back ? (
        <PaperTexture
          colorBack={textureColors.back}
          colorFront={textureColors.front}
          crumples={crumples}
          fade={fade}
          fiber={fiber}
          fit="cover"
          folds={folds}
          roughness={roughness}
        />
      ) : null}
    </div>
  );
}

export function SidebarTexture() {
  return (
    <TextureLayer
      className="workspace-sidebar__texture"
      colorToken={SIDEBAR_TEXTURE_COLOR_TOKEN}
      crumples={0.06}
      fade={0.2}
      fiber={0.14}
      folds={0.015}
      roughness={0.24}
    />
  );
}

export function TextureBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Consistent Logo Pattern background */}
      <div className="absolute inset-0 bg-logo-pattern" />

      {/* WebGL Paper Texture overlay for premium tactile aesthetic */}
      <TextureLayer
        className="absolute inset-0 opacity-12 mix-blend-overlay"
        colorToken={PAGE_TEXTURE_COLOR_TOKEN}
        crumples={0.04}
        fade={0.3}
        fiber={0.08}
        folds={0}
        roughness={0.15}
      />
    </div>
  );
}
