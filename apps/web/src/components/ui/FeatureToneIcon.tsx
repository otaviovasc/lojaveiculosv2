import { cx, type FeatureIcon } from "./featureShared";

export type FeatureToneIconSize = "sm" | "md" | "lg";

const sizeClasses: Record<FeatureToneIconSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

/**
 * Category/identity icon rendered as a bare tone-colored glyph — no filled
 * square or tinted chip behind it. Colour comes from the nearest `--tone-*`
 * scope (for example `.ae-tone--sale`), falling back to the product accent.
 */
export function FeatureToneIcon({
  className,
  icon: Icon,
  size = "md",
}: {
  className?: string;
  icon: FeatureIcon;
  size?: FeatureToneIconSize;
}) {
  return (
    <Icon
      aria-hidden="true"
      className={cx("feature-tone-icon", sizeClasses[size], className)}
    />
  );
}
