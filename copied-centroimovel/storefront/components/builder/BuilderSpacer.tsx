"use client";

interface BuilderSpacerProps {
  height?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";
  customHeight?: number;
}

const heightMap = {
  xs: 8,
  sm: 16,
  md: 32,
  lg: 64,
  xl: 96,
  "2xl": 128,
};

export function BuilderSpacer({
  height = "md",
  customHeight,
}: BuilderSpacerProps) {
  const finalHeight =
    height === "custom" && customHeight
      ? customHeight
      : (heightMap[height as keyof typeof heightMap] ?? heightMap.md);
  return (
    <div
      style={{ height: finalHeight }}
      aria-hidden="true"
      className="w-full"
    />
  );
}
