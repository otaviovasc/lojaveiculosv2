"use client";

export type DividerLineVariant =
  "solid" | "dashed" | "dotted" | "gradient" | "thick";

export interface BuilderDividerProps {
  lineVariant?: DividerLineVariant;
  /** @deprecated Legacy: line variant was stored as `style` string */
  style?: DividerLineVariant | Record<string, unknown>;
  text?: string;
  color?: string;
}

export function resolveDividerLineVariant(
  props: Pick<BuilderDividerProps, "lineVariant" | "style">,
): DividerLineVariant {
  if (typeof props.lineVariant === "string") return props.lineVariant;
  if (typeof props.style === "string") return props.style as DividerLineVariant;
  return "solid";
}

export function BuilderDivider({
  lineVariant,
  style: legacyStyleProp,
  text,
  color,
}: BuilderDividerProps) {
  const variant = resolveDividerLineVariant({
    lineVariant,
    style: legacyStyleProp,
  });
  const borderColor = color || "#E5E5E5";

  const getLineStyle = (isSide?: "left" | "right"): React.CSSProperties => {
    if (variant === "gradient") {
      if (isSide === "left") {
        return {
          background: `linear-gradient(to right, transparent, ${borderColor})`,
        };
      }
      if (isSide === "right") {
        return {
          background: `linear-gradient(to left, transparent, ${borderColor})`,
        };
      }
      return {
        background: `linear-gradient(to right, transparent, ${borderColor}, transparent)`,
      };
    }

    const thickness = variant === "thick" ? "4px" : "1px";
    const borderStyle =
      variant === "dashed"
        ? "dashed"
        : variant === "dotted"
          ? "dotted"
          : "solid";

    return {
      borderTop: `${thickness} ${borderStyle} ${borderColor}`,
    };
  };

  return (
    <div className="px-6 py-12 md:px-12 w-full">
      {text ? (
        <div className="flex items-center gap-6">
          <div className="h-px flex-1" style={getLineStyle("left")} />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 whitespace-nowrap">
            {text}
          </span>
          <div className="h-px flex-1" style={getLineStyle("right")} />
        </div>
      ) : (
        <div className="h-px w-full" style={getLineStyle()} />
      )}
    </div>
  );
}
