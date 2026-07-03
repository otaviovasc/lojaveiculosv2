import { StaticMeshGradient } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

const SHADER_COLOR_TOKENS = [
  "--color-accent",
  "--color-blue-start",
  "--color-green-start",
  "--color-warning",
  "--color-primary",
] as const;

const SHADER_CONTEXT: WebGLContextAttributes = {
  alpha: true,
  antialias: false,
  depth: false,
  failIfMajorPerformanceCaveat: true,
  powerPreference: "low-power",
  preserveDrawingBuffer: false,
  stencil: false,
};

function readShaderColors() {
  if (typeof window === "undefined") {
    return [];
  }

  const rootStyles = window.getComputedStyle(document.documentElement);
  return SHADER_COLOR_TOKENS.map((token) =>
    rootStyles.getPropertyValue(token).trim(),
  ).filter(Boolean);
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
    return Boolean(canvas.getContext("webgl2", SHADER_CONTEXT));
  } catch {
    return false;
  }
}

export function LandingHeroShader() {
  const [colors, setColors] = useState<string[]>([]);
  const [isShaderReady, setIsShaderReady] = useState(false);

  useEffect(() => {
    const tokenColors = readShaderColors();
    setColors(tokenColors);
    setIsShaderReady(tokenColors.length >= 2 && supportsWebGl2());
  }, []);

  return (
    <div
      aria-hidden="true"
      className="landing-hero-shader"
      data-shader-state={isShaderReady ? "webgl" : "fallback"}
      data-testid="landing-hero-shader"
    >
      {isShaderReady ? (
        <StaticMeshGradient
          className="landing-hero-shader-canvas"
          colors={colors}
          fit="cover"
          grainMixer={0}
          grainOverlay={0}
          maxPixelCount={480_000}
          minPixelRatio={1}
          mixing={0.88}
          positions={24}
          rotation={8}
          scale={1.16}
          speed={0}
          waveX={0.18}
          waveXShift={0.42}
          waveY={0.08}
          waveYShift={0.64}
          webGlContextAttributes={SHADER_CONTEXT}
        />
      ) : null}
    </div>
  );
}
