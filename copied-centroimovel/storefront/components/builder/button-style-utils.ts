import type { CSSProperties } from "react";

interface StandardButtonStyleParams {
  variant?: "primary" | "secondary" | "outline";
  primaryColor: string;
  textColor: string;
  borderColor: string;
}

export function getStandardButtonStyles({
  variant = "primary",
  primaryColor,
  textColor,
  borderColor,
}: StandardButtonStyleParams): CSSProperties {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: "#FFFFFF",
        color: primaryColor,
        border: `2px solid ${primaryColor}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      };
    case "outline":
      return {
        backgroundColor: "transparent",
        color: textColor,
        border: `2px solid ${borderColor}`,
        boxShadow: "none",
      };
    default:
      return {
        backgroundColor: primaryColor,
        color: textColor,
        border: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      };
  }
}
