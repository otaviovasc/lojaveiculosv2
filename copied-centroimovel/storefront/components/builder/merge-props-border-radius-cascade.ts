import type { ComponentStyleProps } from "@centroimovel/types";

/**
 * Returns the radius only when the editor actually set `style.borderRadius`
 * (including `"none"`). Omitted keys do not cascade as a fake default.
 */
export function explicitBorderRadiusFromStyle(
  style?: ComponentStyleProps | Record<string, unknown> | null,
): ComponentStyleProps["borderRadius"] | undefined {
  if (!style || typeof style !== "object") return undefined;
  const o = style as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(o, "borderRadius")) {
    return undefined;
  }
  const v = o.borderRadius;
  if (v === undefined || v === null) return undefined;
  return v as ComponentStyleProps["borderRadius"];
}

/**
 * First matching explicit `borderRadius` on `styles` wins (left-to-right),
 * otherwise fall back to `inherited` from ancestors.
 * Use for container / section / column → nested `BuilderComponentRenderer`.
 */
export function pickBorderRadiusCascade(
  inherited: ComponentStyleProps["borderRadius"] | undefined,
  ...stylesInPriorityOrder: Array<ComponentStyleProps | undefined>
): ComponentStyleProps["borderRadius"] | undefined {
  for (const s of stylesInPriorityOrder) {
    const e = explicitBorderRadiusFromStyle(s);
    if (e !== undefined) return e;
  }
  return inherited;
}

/**
 * Applies ancestor radius to a nested block when the block has not set its own
 * `style.borderRadius` (same idea as `BuilderImage` reading `style.borderRadius`).
 * `inherited` may be `"none"` — that is propagated as an explicit sharp corner.
 */
export function mergePropsBorderRadiusCascade(
  props: Record<string, unknown>,
  inherited?: ComponentStyleProps["borderRadius"],
): Record<string, unknown> {
  if (inherited === undefined || inherited === null) {
    return props;
  }

  const st = props.style;
  /** Divider (legacy) used `style` as a string line variant — never replace with an object. */
  if (typeof st === "string") {
    return props;
  }
  if (st && typeof st === "object") {
    const styleObj = st as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(styleObj, "borderRadius")) {
      return props;
    }
  }

  return {
    ...props,
    style: {
      ...(typeof st === "object" && st ? { ...st } : {}),
      borderRadius: inherited,
    },
  };
}
