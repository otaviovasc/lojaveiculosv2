import type { ComponentType } from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type FeatureIcon = ComponentType<{ className?: string }>;
